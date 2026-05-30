const mongoose = require('mongoose')

const SEVERITY_MAP = {
  underage_concern:  'critical',
  illegal_content:   'critical',
  consent_violation: 'high',
  harassment:        'high',
}

const reportSchema = new mongoose.Schema({
  reporterId:     { type: String, required: true },
  reportedUserId: { type: String, required: true },

  contentType: {
    type: String,
    enum: ['profile', 'message', 'content'],
    required: true,
  },
  contentId: { type: String, default: null },

  category: {
    type: String,
    enum: ['fake_or_bot', 'harassment', 'consent_violation', 'illegal_content',
           'underage_concern', 'spam', 'other'],
    required: true,
  },

  detail: { type: String, maxlength: 200, default: '' },

  severity: {
    type: String,
    enum: ['standard', 'high', 'critical'],
    default: 'standard',
  },

  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved_actioned', 'resolved_dismissed'],
    default: 'pending',
  },

  moderatorId:     { type: String, default: null },
  moderatorNotes:  { type: String, default: '' },
  moderatorAction: {
    type: String,
    enum: ['warn', 'suspend_7d', 'permanent_ban', 'dismissed'],
    default: null,
  },

  createdAt:     { type: Date, default: Date.now },
  resolvedAt:    { type: Date, default: null },
  autoSuspended: { type: Boolean, default: false },
})

reportSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('category')) {
    this.severity = SEVERITY_MAP[this.category] ?? 'standard'
  }
  next()
})

reportSchema.index({ status: 1, severity: -1, createdAt: 1 })

module.exports = mongoose.model('Report', reportSchema)
module.exports.SEVERITY_MAP = SEVERITY_MAP
