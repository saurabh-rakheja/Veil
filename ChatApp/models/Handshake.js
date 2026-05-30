const mongoose = require('mongoose')

const snapshotSchema = new mongoose.Schema({
  initiatorInterests: [String],
  recipientInterests: [String],
  sharedInterests:    [String],
  compatibilityScore: Number,
  limitConflicts:     [String],
  snapshotTakenAt:    { type: Date, default: Date.now },
}, { _id: false })

const handshakeSchema = new mongoose.Schema({
  initiatorId: { type: String, required: true },
  recipientId: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'withdrawn'],
    default: 'pending',
  },

  introductionMessage: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 300,
  },

  // Taken at acceptance time and never updated — legal consent record.
  compatibilitySnapshot: { type: snapshotSchema, default: null },

  cooldownUntil: { type: Date, default: null }, // Date.now + 30d on decline
  expiresAt:     { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  initiatedAt:   { type: Date, default: Date.now },
  resolvedAt:    { type: Date, default: null },
  auditRef:      { type: String, default: null },
})

handshakeSchema.index({ initiatorId: 1, recipientId: 1 })

module.exports = mongoose.model('Handshake', handshakeSchema)
