const mongoose = require('mongoose')

const contentSchema = new mongoose.Schema({
  authorId: { type: String, required: true, index: true },

  zone: { type: Number, enum: [1, 2, 3], required: true },

  contentType: {
    type: String,
    enum: ['post', 'image'],
    required: true,
  },

  text:     { type: String, maxlength: 1000, default: '' },
  mediaUrl: { type: String, default: null }, // S3 URL after upload
  blurHash: { type: String, default: null }, // Low-res preview for Zone 3 cards in Zone 2

  moderationStatus: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected'],
    // Zone 1 & 2 approved immediately; Zone 3 held pending PhotoDNA scan
    default: 'approved',
  },

  isZone3:   { type: Boolean, default: false },
  viewCount: { type: Number,  default: 0 },

  createdAt: { type: Date, default: Date.now, index: true },
})

// Compound index for zone-filtered feeds sorted by date
contentSchema.index({ zone: 1, createdAt: -1 })
contentSchema.index({ authorId: 1, createdAt: -1 })

module.exports = mongoose.model('Content', contentSchema)
