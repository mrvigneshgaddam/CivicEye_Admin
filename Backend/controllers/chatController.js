const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // Firebase Message class
const User = require('../models/User');
const { db } = require('../config/db');

const chatController = {
  getConversations: async (req, res) => {
    try {
      const conversations = await Conversation.findByUser(req.user.uid);
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  },

  createConversation: async (req, res) => {
    try {
      const { participantId, title, keys } = req.body;
      if (!participantId) return res.status(400).json({ error: 'Participant ID required' });

      const participant = await User.findById(participantId);
      if (!participant) return res.status(404).json({ error: 'Participant not found' });

      const existingConvs = await Conversation.findByUser(req.user.uid);
      const existingConv = existingConvs.find(conv =>
        conv.participants.includes(participantId) &&
        conv.participants.length === 2
      );

      if (existingConv) return res.json(existingConv);

      const conversation = new Conversation({
        participants: [req.user.uid, participantId],
        title: title || null,
        keys: keys || {},
        lastUpdated: new Date()
      });

      await conversation.save();

      await db.collection('messageLogs').add({
        type: 'conversation_created',
        conversationId: conversation.id,
        participants: conversation.participants,
        createdAt: new Date(),
        initiatedBy: req.user.uid
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  },

  getMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50 } = req.query;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(req.user.uid)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await Message.findByConversation(conversationId, parseInt(limit));
      res.json(messages.reverse());
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  updateMessageStatus: async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const { status } = req.body;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(req.user.uid)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await Message.updateStatus(messageId, conversationId, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Update message status error:', error);
      res.status(500).json({ error: 'Failed to update message status' });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { conversationId, senderId, ciphertext, iv } = req.body;
      const message = new Message({ conversationId, senderId, ciphertext, iv });
      await message.save();

      res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ success: false, message: 'Failed to send message', error: err.message });
    }
  }
};

module.exports = chatController;
