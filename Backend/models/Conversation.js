const { db } = require('../config/db');

class Conversation {
  constructor(data) {
    this.id = data.id;
    this.participants = data.participants || [];
    this.title = data.title;
    this.lastMessage = data.lastMessage;
    this.lastUpdated = data.lastUpdated || new Date();
    this.keys = data.keys || {}; // Encrypted keys for participants
  }

  static async findById(id) {
    try {
      const doc = await db.collection('conversations').doc(id).get();
      return doc.exists ? new Conversation({ id, ...doc.data() }) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUser(uid) {
    try {
      const snapshot = await db.collection('conversations')
        .where('participants', 'array-contains', uid)
        .orderBy('lastUpdated', 'desc')
        .get();

      return snapshot.docs.map(doc => new Conversation({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  }

  async save() {
    try {
      const convData = { ...this };
      delete convData.id;

      let docRef;
      if (this.id) {
        docRef = db.collection('conversations').doc(this.id);
        await docRef.update(convData);
      } else {
        docRef = await db.collection('conversations').add(convData);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  async addParticipant(uid, keyData) {
    if (!this.participants.includes(uid)) {
      this.participants.push(uid);
    }
    if (keyData) {
      this.keys[uid] = keyData;
    }
    this.lastUpdated = new Date();
    return this.save();
  }
}

module.exports = Conversation;