const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { encryptMessage, decryptMessage } = require('../utils/cryptoUtils');

const chatController = {
  getConversations: async (req, res) => {
    try {
      const conversations = await Conversation.find({
        participants: req.userId
      }).populate('participants', 'name email department badgeNumber')
        .sort({ updatedAt: -1 });

      res.json({
        success: true,
        conversations: conversations.map(conv => ({
          id: conv._id,
          name: conv.name,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          unreadCount: conv.participantsData?.find(p => p.userId.toString() === req.userId.toString())?.unreadCount || 0,
          updatedAt: conv.updatedAt
        }))
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
    }
  },

  createConversation: async (req, res) => {
    try {
      const { participantIds, name } = req.body;
      
      if (!participantIds || !Array.isArray(participantIds)) {
        return res.status(400).json({ success: false, error: 'Participant IDs are required' });
      }

      // Include current user in participants
      const allParticipants = [...new Set([req.userId.toString(), ...participantIds])];
      
      if (allParticipants.length < 2) {
        return res.status(400).json({ success: false, error: 'At least 2 participants required' });
      }

      const conversation = new Conversation({
        name: name || `Chat with ${allParticipants.length} participants`,
        participants: allParticipants,
        participantsData: allParticipants.map(userId => ({
          userId,
          unreadCount: userId === req.userId.toString() ? 0 : 1
        })),
        createdBy: req.userId
      });

      await conversation.save();
      await conversation.populate('participants', 'name email department badgeNumber');

      res.status(201).json({
        success: true,
        conversation: {
          id: conversation._id,
          name: conversation.name,
          participants: conversation.participants,
          createdAt: conversation.createdAt
        }
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  },

  getMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: req.userId
      });

      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'name email department badgeNumber')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Mark messages as read
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: req.userId },
          readBy: { $ne: req.userId }
        },
        { $addToSet: { readBy: req.userId } }
      );

      // Update unread count
      await Conversation.updateOne(
        { _id: conversationId, 'participantsData.userId': req.userId },
        { $set: { 'participantsData.$.unreadCount': 0 } }
      );

      res.json({
        success: true,
        messages: messages.reverse(),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Message.countDocuments({ conversation: conversationId })
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, encryptedContent, iv } = req.body;

      if (!content && !encryptedContent) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: req.userId
      });

      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const message = new Message({
        conversation: conversationId,
        sender: req.userId,
        content,
        encryptedContent,
        iv,
        messageType: encryptedContent ? 'encrypted' : 'text'
      });

      await message.save();
      await message.populate('sender', 'name email department badgeNumber');

      // Update conversation last message and timestamp
      conversation.lastMessage = {
        content: content || 'Encrypted message',
        sender: req.userId,
        timestamp: new Date()
      };
      conversation.updatedAt = new Date();
      
      // Update unread counts for other participants
      conversation.participantsData.forEach(participant => {
        if (participant.userId.toString() !== req.userId.toString()) {
          participant.unreadCount = (participant.unreadCount || 0) + 1;
        }
      });

      await conversation.save();

      res.status(201).json({
        success: true,
        message: {
          id: message._id,
          content: message.content,
          encryptedContent: message.encryptedContent,
          sender: message.sender,
          messageType: message.messageType,
          createdAt: message.createdAt
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  },

  updateMessageStatus: async (req, res) => {
    try {
      const { messageId } = req.params;
      const { status } = req.body;

      const message = await Message.findOneAndUpdate(
        { _id: messageId, sender: req.userId },
        { status },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      res.json({ success: true, message });
    } catch (error) {
      console.error('Update message status error:', error);
      res.status(500).json({ success: false, error: 'Failed to update message status' });
    }
  }
};

module.exports = chatController;