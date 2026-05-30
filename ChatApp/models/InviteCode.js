const mongoose = require('mongoose')

const inviteCodeSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, uppercase: true },
  createdByUserId: { type: String, required: true },
  usedByUserId:    { type: String, default: null },
  usedAt:          { type: Date,   default: null },
  isActive:        { type: Boolean, default: true },
  createdAt:       { type: Date,   default: Date.now },
})

module.exports = mongoose.model('InviteCode', inviteCodeSchema)
