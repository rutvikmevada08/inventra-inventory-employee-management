const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const softDelete = require('./plugins/softDelete');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email address is not valid'],
    },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    passwordHash: { type: String, select: false },
    // Legacy staff records were created without a password and could not log in.
    loginEnabled: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);
userSchema.plugin(softDelete);

userSchema.methods.setPassword = async function setPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  this.passwordHash = await bcrypt.hash(plain, 12);
  this.loginEnabled = true;
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return this.passwordHash ? bcrypt.compare(plain, this.passwordHash) : Promise.resolve(false);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
