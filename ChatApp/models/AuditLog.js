const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  userId:             { type: String, required: true, index: true },
  actionType:         {
    type: String,
    enum: [
      'account_created', 'phone_verified', 'age_confirmed', 'gdpr_consent_given',
      'onboarding_completed', 'handshake_initiated', 'handshake_accepted',
      'handshake_declined', 'connection_established', 'trusted_tier_granted',
      'report_filed', 'report_resolved', 'account_warned', 'account_suspended',
      'account_banned', 'account_deleted', 'invite_code_redeemed',
      'profile_updated', 'visibility_settings_changed', 'zone3_opted_in',
    ],
    required: true,
  },
  targetId:           { type: String, default: null },
  metadata:           { type: mongoose.Schema.Types.Mixed, default: {} },
  ipHash:             { type: String, default: null },
  consentTextVersion: { type: String, default: null },
  timestamp:          { type: Date, default: Date.now, index: true },
  retainUntil:        { type: Date, default: null },
})

module.exports = mongoose.model('AuditLog', schema)
