const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Conversation routes
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.patch('/conversations/:conversationId/messages/:messageId/status', chatController.updateMessageStatus);

module.exports = router;