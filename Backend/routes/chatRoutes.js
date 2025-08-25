// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middlewares/auth'); // Use 'auth' instead of 'authenticateToken'

// All routes require authentication
router.use(auth); // Use JWT-based auth instead of Firebase auth

// Conversation routes
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.patch('/conversations/:conversationId/messages/:messageId/status', chatController.updateMessageStatus);

module.exports = router;