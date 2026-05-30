const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  userId:           { type: String, required: true, unique: true },
  displayName:      { type: String, default: '' },
  city:             { type: String, default: '' },
  bio:              { type: String, maxlength: 200, default: '' },
  pronouns:         { type: String, default: '' },
  profilePhoto:     { type: String, default: null },
  verificationTier: {
    type: String,
    enum: ['unverified', 'phone_verified', 'id_verified'],
    default: 'unverified',
  },
  isProfileVisible: { type: Boolean, default: true },

  notificationPreferences: {
    handshakeReceived: { type: Boolean, default: true },
    handshakeAccepted: { type: Boolean, default: true },
    newMessage:        { type: Boolean, default: true },
  },

  // Moderation fields
  isAdmin:            { type: Boolean, default: false },
  isSuspendedPending: { type: Boolean, default: false },
  suspendedUntil:     { type: Date,    default: null },
  isBanned:           { type: Boolean, default: false },
  warningCount:       { type: Number,  default: 0 },

  // Zone 3 explicit content opt-in (requires phone_verified or id_verified)
  zone3OptedIn:   { type: Boolean, default: false },
  zone3OptedInAt: { type: Date,    default: null },
}, { timestamps: true })

module.exports = mongoose.model('UserProfile', schema)
