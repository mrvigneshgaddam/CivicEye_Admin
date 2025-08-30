// Backend/scripts/create-police.js
require('dotenv').config();
const mongoose = require('mongoose');
const Police = require('../models/Police');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    await mongoose.connect(uri);

    // >>> EDIT THESE FIELDS FOR THE NEW OFFICER <<<
    const doc = await Police.create({
      name: 'Vignesh Gaddam',
      email: 'vigneshgaddam100@gmail.com',
      phone: '+91-9123456789',
      badgeId: 'BDG-3008',
      rank: 'Inspector',
      department: 'Crime Investigation Department',
      status: 'Active',
      assignedCases: 4,
      policeStation: 'Connaught Place Police Station',
      password: '1234',         // plain here; will be hashed by the pre-save hook
    });

    console.log('✅ Created officer:', { id: doc._id.toString(), email: doc.email });
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();