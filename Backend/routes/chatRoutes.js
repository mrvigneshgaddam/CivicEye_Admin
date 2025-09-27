// routes/chat.js - Add these endpoints to your backend
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const auth = require('../middlewares/auth');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload file to MongoDB
router.post('/upload-file', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const db = req.app.locals.db;
    const bucket = new GridFSBucket(db, { bucketName: 'files' });
    
    const filename = `${Date.now()}-${req.file.originalname}`;
    
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: req.file.originalname,
        uploadDate: new Date(),
        senderId: req.body.senderId,
        conversationId: req.body.conversationId,
        mimeType: req.file.mimetype
      }
    });
    
    uploadStream.end(req.file.buffer);
    
    uploadStream.on('finish', (file) => {
      res.json({
        success: true,
        message: 'File uploaded successfully',
        fileId: file._id.toString(),
        fileName: req.file.originalname,
        fileUrl: `/api/chat/download-file/${file._id}`
      });
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// Download file from MongoDB
router.get('/download-file/:fileId', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const bucket = new GridFSBucket(db, { bucketName: 'files' });
    
    const fileId = new ObjectId(req.params.fileId);
    const file = await bucket.find({ _id: fileId }).next();
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    res.set('Content-Type', file.metadata.mimeType);
    res.set('Content-Disposition', `attachment; filename="${file.metadata.originalName}"`);
    
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ success: false, message: 'File download failed' });
  }
});

module.exports = router;