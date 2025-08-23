const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  participants: [participantSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  encryptionKey: {
    type: String // For end-to-end encryption
  }
}, {
  timestamps: true
});

// Add index for better performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Virtual for getting participant count
conversationSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Method to add participant
conversationSchema.methods.addParticipant = function(userId) {
  if (!this.participants.some(p => p.user.toString() === userId.toString())) {
    this.participants.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);