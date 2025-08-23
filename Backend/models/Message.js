const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true
  },
  encryptedContent: {
    type: String // For end-to-end encrypted messages
  },
  iv: {
    type: String // Initialization vector for encryption
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'encrypted'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for message delivery status
messageSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered' || this.status === 'read';
});

// Virtual for message read status
messageSchema.virtual('isRead').get(function() {
  return this.status === 'read';
});

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

// Method to mark as read by specific user
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
  }
  if (this.readBy.length === this.conversation.participants.length - 1) {
    this.status = 'read';
  }
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);