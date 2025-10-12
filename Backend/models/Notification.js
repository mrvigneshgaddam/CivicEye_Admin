const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'alert' },
  priority: { type: String, default: 'normal' },
  relatedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
  relatedModel: { type: String, enum: ['Report'], default: 'Report' },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
