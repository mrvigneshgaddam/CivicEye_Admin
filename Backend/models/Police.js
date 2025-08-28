const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const policeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    badgeId: { type: String, index: true, trim: true },
    rank: { type: String, trim: true },
    department: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'On Leave', 'Inactive', 'Suspended'], default: 'Active' },
    assignedCases: { type: Number, default: 0 },

    policeStation: { type: String, trim: true },        // <-- NEW FIELD

    // auth
    password: { type: String, required: true, minlength: 6, select: false },
  },
  { timestamps: true }
);

policeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

policeSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Pin to the exact Atlas collection name
module.exports = mongoose.model('Police', policeSchema, 'polices');