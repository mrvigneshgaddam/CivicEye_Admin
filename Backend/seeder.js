require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Officer = require('./models/Officer');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicEye';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ MongoDB connected");

    // Clear old data
    await Incident.deleteMany();
    await Officer.deleteMany();
    await User.deleteMany();

    // Insert Users
    const users = await User.insertMany([
      { name: "Alice", email: "alice@example.com", password: "123456", isActive: true },
      { name: "Bob", email: "bob@example.com", password: "123456", isActive: true },
      { name: "Charlie", email: "charlie@example.com", password: "123456", isActive: false }
    ]);

    // Insert Officers
    const officers = await Officer.insertMany([
      { name: "Officer John", badgeNumber: "A123", rank: "SI", status: "active" },
      { name: "Officer Jane", badgeNumber: "B456", rank: "Inspector", status: "inactive" },
      { name: "Officer Mike", badgeNumber: "C789", rank: "SI", status: "active" }
    ]);

    // Insert Incidents
    await Incident.insertMany([
      { incidentType: "Fire", description: "Warehouse fire", userId: users[0]._id, createdAt: new Date("2025-01-12") },
      { incidentType: "Medical", description: "Heart attack", userId: users[1]._id, createdAt: new Date("2025-02-05") },
      { incidentType: "Traffic", description: "Highway crash", userId: users[2]._id, createdAt: new Date("2025-02-20") },
      { incidentType: "Fire", description: "Car fire", userId: users[0]._id, createdAt: new Date("2025-03-01") },
      { incidentType: "Security", description: "Robbery attempt", userId: users[1]._id, createdAt: new Date("2025-03-15") },
      { incidentType: "Other", description: "Public disturbance", userId: users[2]._id, createdAt: new Date("2025-04-10") }
    ]);

    console.log("✅ Sample data seeded!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
