const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true, index: true },

  type: {
    type: String,
    enum: [
      'handshake_received',
      'handshake_accepted',
      'handshake_declined',
      'handshake_expired',
      'new_message',
      'report_update',
      'system',
    ],
    required: true,
  },

  data: {
    actorId:          { type: String },
    actorDisplayName: { type: String },
    handshakeId:      { type: String },
    conversationId:   { type: String },
    messagePreview:   { type: String },
  },

  isRead:        { type: Boolean, default: false },
  isSafetyAlert: { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now, index: true },
})

module.exports = mongoose.model('Notification', notificationSchema)
