const crypto = require('crypto');
const { ENCRYPTION_KEY, IV_LENGTH, ALGORITHM } = require('../config/security');

// Text encoder/decoder
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Generate encryption key from passphrase
function deriveKeyFromPassphrase(passphrase, salt) {
  return crypto.pbkdf2Sync(
    passphrase, 
    salt, 
    100000, 
    32, 
    'sha512'
  );
}

// Encrypt message
async function encryptMessage(message, encryptionKey) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt message
async function decryptMessage(encryptedData, encryptionKey) {
  try {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

// Generate key pair for E2E encryption
async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: ENCRYPTION_KEY
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      resolve({ publicKey, privateKey });
    });
  });
}

// Generate HMAC for message authentication
function generateHMAC(message, key) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(message);
  return hmac.digest('hex');
}

// Verify HMAC
function verifyHMAC(message, hmac, key) {
  const calculatedHmac = generateHMAC(message, key);
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac, 'hex'),
    Buffer.from(hmac, 'hex')
  );
}

// Generate random encryption key
function generateRandomKey(length = 32) {
  return crypto.randomBytes(length);
}

module.exports = {
  encryptMessage,
  decryptMessage,
  generateKeyPair,
  generateHMAC,
  verifyHMAC,
  generateRandomKey,
  deriveKeyFromPassphrase
};