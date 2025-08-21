// models/Message.js

const { db } = require('../config/db'); // Firebase
const mongoose = require('mongoose');

/******************************
 * Firebase Message Class
 ******************************/
class MessageFirebase {
  constructor(data) {
    this.id = data.id;
    this.conversationId = data.conversationId;
    this.senderId = data.senderId;
    this.ciphertext = data.ciphertext;
    this.iv = data.iv;
    this.status = data.status || 'sent'; // sent, delivered, read
    this.createdAt = data.createdAt || new Date();
  }

  static async findByConversation(conversationId, limit = 50) {
    try {
      const snapshot = await db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => new MessageFirebase({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  }

  async save() {
    try {
      const messageData = { ...this };
      delete messageData.id;

      let docRef;
      if (this.id) {
        docRef = db.collection('conversations')
          .doc(this.conversationId)
          .collection('messages')
          .doc(this.id);
        await docRef.update(messageData);
      } else {
        docRef = await db.collection('conversations')
          .doc(this.conversationId)
          .collection('messages')
          .add(messageData);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(messageId, conversationId, status) {
    try {
      await db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .update({ status });
    } catch (error) {
      throw error;
    }
  }
}

/******************************
 * MongoDB Message Schema
 * (Optional: Only keep if needed for legacy)
 ******************************/
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  iv: { type: String, required: true }, // Initialization vector for AES
  mac: { type: String, required: true }, // Message Authentication Code
  timestamp: { type: Date, default: Date.now }
});

// Indexes for faster querying
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, sender: 1 });

const MessageMongo = mongoose.model('Message', messageSchema);

module.exports = { MessageFirebase, MessageMongo };
