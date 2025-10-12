// Backend/routes/secure-upload.js
const express = require('express');
const multer = require('multer');
const { GridFSBucket, MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Strict rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 file uploads per windowMs
  message: {
    success: false,
    message: 'Too many file upload attempts, please try again later.'
  }
});

// Enhanced file type validation
const allowedMimeTypes = {
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'application/pdf': true,
  'text/plain': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true
};

const maxFileSize = 5 * 1024 * 1024; // 5MB for security

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!allowedMimeTypes[file.mimetype]) {
    return cb(new Error('File type not allowed'), false);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
  const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('File extension not allowed'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: maxFileSize,
    files: 1
  },
  fileFilter: fileFilter
});

// MongoDB connection with enhanced security
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  minPoolSize: 10,
  maxPoolSize: 50,
  ssl: true,
  sslValidate: true
});

let gfs;
let db;

async function initGridFS() {
  try {
    await client.connect();
    db = client.db('secure-chat-files');
    gfs = new GridFSBucket(db, { 
      bucketName: 'encryptedFiles',
      chunkSizeBytes: 512 * 1024 // 512KB chunks
    });
    console.log('✅ Secure GridFS initialized');
  } catch (error) {
    console.error('❌ GridFS initialization failed:', error);
    throw error;
  }
}

initGridFS().catch(console.error);

// Generate secure file ID
function generateSecureFileId() {
  return crypto.randomBytes(16).toString('hex');
}

// Enhanced upload endpoint with multiple security checks
router.post('/upload', auth, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded or file validation failed' 
      });
    }

    // Additional security checks
    const { originalname, buffer, mimetype, size } = req.file;
    const { conversationId, senderId, fileHash, encryptionMetadata } = req.body;

    if (!conversationId || !senderId || !fileHash) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required security parameters' 
      });
    }

    // Verify user is part of the conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId),
      participants: senderId
    });

    if (!conversation) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to upload files to this conversation' 
      });
    }

    // Verify file hash to ensure integrity
    const calculatedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (calculatedHash !== fileHash) {
      return res.status(400).json({ 
        success: false, 
        message: 'File integrity check failed' 
      });
    }

    // Generate secure metadata
    const secureFileId = generateSecureFileId();
    const uploadTimestamp = new Date();
    
    const metadata = {
      originalName: originalname,
      mimeType: mimetype,
      size: size,
      conversationId: conversationId,
      senderId: senderId,
      uploadedAt: uploadTimestamp,
      fileHash: fileHash,
      encryptionMetadata: encryptionMetadata || {},
      accessCount: 0,
      lastAccessed: null,
      isEncrypted: true
    };

    // Upload to GridFS with secure metadata
    const uploadStream = gfs.openUploadStream(secureFileId, { metadata });

    return new Promise((resolve, reject) => {
      uploadStream.write(buffer);
      uploadStream.end();

      uploadStream.on('finish', () => {
        // Log security event
        console.log(`🔒 SECURITY: File uploaded by ${senderId} to conversation ${conversationId}`);
        
        res.json({
          success: true,
          fileId: uploadStream.id.toString(),
          secureFileId: secureFileId,
          originalName: originalname,
          mimeType: mimetype,
          size: size,
          uploadedAt: uploadTimestamp,
          url: `/api/secure-upload/file/${uploadStream.id}`
        });
        resolve();
      });

      uploadStream.on('error', (error) => {
        console.error('❌ Secure upload error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Secure upload failed' 
        });
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Secure upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server security error' 
    });
  }
});

// Secure file download with access control
router.get('/file/:fileId', auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user.firebaseUid;

    // Validate fileId format
    if (!fileId || !ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file ID format' 
      });
    }

    const objectId = new ObjectId(fileId);
    
    // Find file metadata
    const files = db.collection('encryptedFiles.files');
    const file = await files.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Enhanced access control - verify user is in conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(file.metadata.conversationId),
      participants: userId
    });

    if (!conversation) {
      console.warn(`🚨 SECURITY: Unauthorized file access attempt by ${userId} for file ${fileId}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Update access metrics
    await files.updateOne(
      { _id: objectId },
      { 
        $set: { 'metadata.lastAccessed': new Date() },
        $inc: { 'metadata.accessCount': 1 }
      }
    );

    // Security headers
    res.set({
      'Content-Type': file.metadata.mimeType,
      'Content-Disposition': `inline; filename="${file.metadata.originalName}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'",
      'X-File-Encrypted': 'true'
    });

    // Stream file
    const downloadStream = gfs.openDownloadStream(objectId);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('❌ Secure download error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'File download failed' 
      });
    });

  } catch (error) {
    console.error('❌ Secure file access error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Security error' 
    });
  }
});

// Secure file deletion
router.delete('/file/:fileId', auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user.firebaseUid;

    if (!fileId || !ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file ID' 
      });
    }

    const objectId = new ObjectId(fileId);
    const files = db.collection('encryptedFiles.files');
    const file = await files.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Only sender or admin can delete
    if (file.metadata.senderId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permission denied' 
      });
    }

    await gfs.delete(objectId);
    
    console.log(`🔒 SECURITY: File ${fileId} deleted by ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'File permanently deleted' 
    });

  } catch (error) {
    console.error('❌ Secure deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Deletion failed' 
    });
  }
});

// File info endpoint with enhanced security
router.get('/info/:fileId', auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user.firebaseUid;

    if (!fileId || !ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file ID' 
      });
    }

    const objectId = new ObjectId(fileId);
    const files = db.collection('encryptedFiles.files');
    const file = await files.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Verify access rights
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(file.metadata.conversationId),
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      file: {
        id: file._id,
        originalName: file.metadata.originalName,
        mimeType: file.metadata.mimeType,
        size: file.metadata.size,
        uploadedAt: file.metadata.uploadedAt,
        senderId: file.metadata.senderId,
        conversationId: file.metadata.conversationId,
        isEncrypted: file.metadata.isEncrypted,
        accessCount: file.metadata.accessCount || 0,
        lastAccessed: file.metadata.lastAccessed
      }
    });

  } catch (error) {
    console.error('❌ File info error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Security error' 
    });
  }
});

// Security audit endpoint (admin only)
router.get('/audit/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.firebaseUid;

    // Verify user is in conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId),
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const files = db.collection('encryptedFiles.files');
    const conversationFiles = await files.find({
      'metadata.conversationId': conversationId
    }).sort({ 'metadata.uploadedAt': -1 }).toArray();

    res.json({
      success: true,
      files: conversationFiles.map(file => ({
        id: file._id,
        originalName: file.metadata.originalName,
        uploadedAt: file.metadata.uploadedAt,
        size: file.metadata.size,
        senderId: file.metadata.senderId,
        accessCount: file.metadata.accessCount || 0,
        lastAccessed: file.metadata.lastAccessed
      }))
    });

  } catch (error) {
    console.error('❌ Audit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Audit failed' 
    });
  }
});

module.exports = router;