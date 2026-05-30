const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, trim: true },
  password:     { type: String, required: true },
  gender:       { type: String, enum: ['Male', 'Female', 'Prefer not to say'], required: true },
  description:  { type: String, default: '' },
  tags:         [{ type: String }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
