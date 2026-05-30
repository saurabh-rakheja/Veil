const mongoose = require('mongoose')

const blockSchema = new mongoose.Schema({
  blockerId:     { type: String, required: true },
  blockedUserId: { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
})

blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true })

module.exports = mongoose.model('Block', blockSchema)
