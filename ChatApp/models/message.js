const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:      { type: String, required: true },
  content:     { type: String, required: true },
  room:        { type: String, required: true },
  recipientId: { type: String, default: null, index: true },
  isRead:      { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);