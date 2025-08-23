const mongoose = require('mongoose');
const Police = require('../models/Police');
const Emergency = require('../models/Emergency');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const FIR = require('../models/firModel');
const Report = require('../models/Report');

const createSampleData = async () => {
  try {
    console.log('Creating sample data for CivicEye...');

    // Get existing users to use as references
    const User = require('../models/User');
    const existingUsers = await User.find().limit(2);
    
    if (existingUsers.length === 0) {
      console.log('❌ No existing users found. Please create users first.');
      return;
    }

    // Create sample police officers
    const officers = await Police.create([
      { 
        name: "John Doe",
        rank: "Inspector",
        status: "On Duty",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: "Jane Smith",
        rank: "Sergeant",
        status: "On Duty",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: "Robert Johnson",
        rank: "Constable",
        status: "Off Duty",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: "Sarah Williams",
        rank: "Captain",
        status: "On Duty",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create sample emergencies
    const emergencies = await Emergency.create([
      { 
        type: "fire",
        location: "District 5 Commercial Building",
        description: "Fire incident reported in commercial building, 3rd floor",
        status: "pending",
        reportedAt: new Date()
      },
      { 
        type: "medical",
        location: "Central Hospital Emergency Room",
        description: "Heart attack emergency reported, patient needs immediate attention",
        status: "in-progress",
        reportedAt: new Date()
      },
      { 
        type: "crime",
        location: "City Center Mall",
        description: "Robbery in progress at jewelry store",
        status: "pending",
        reportedAt: new Date()
      },
      { 
        type: "accident",
        location: "Highway 101, Mile Marker 25",
        description: "Major car accident with injuries, multiple vehicles involved",
        status: "resolved",
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    ]);

    // Create sample FIRs
    const firs = await FIR.create([
      { 
        complainantName: "Rajesh Kumar",
        complainantContact: "+91-9876543210",
        accusedName: "Unknown",
        incidentDate: new Date('2024-01-15'),
        incidentLocation: "Main Market, Sector 5",
        description: "Mobile phone snatched by two unidentified persons on motorcycle",
        policeStation: "Sector 5 Police Station",
        status: "under-investigation",
        filedAt: new Date()
      },
      { 
        complainantName: "Priya Sharma",
        complainantContact: "+91-9876543211",
        accusedName: "Neighbor - Mr. Gupta",
        incidentDate: new Date('2024-01-14'),
        incidentLocation: "Apartment 304, Green Valley Society",
        description: "Domestic dispute turned violent, property damage occurred",
        policeStation: "Central Police Station",
        status: "filed",
        filedAt: new Date()
      }
    ]);

    // Create sample reports
    const reports = await Report.create([
      { 
        type: "Fire",
        description: "Building fire reported in commercial area, smoke visible from 5th floor",
        location: "Business District, Tower B",
        status: "In Progress",
        reportedAt: new Date()
      },
      { 
        type: "Medical",
        description: "Elderly person collapsed near park, requires immediate medical attention",
        location: "Central Park, Near Fountain",
        status: "Pending",
        reportedAt: new Date()
      },
      { 
        type: "Traffic",
        description: "Major traffic jam due to road accident, vehicles stuck for over 2 hours",
        location: "Main Highway Exit 5",
        status: "Resolved",
        reportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      }
    ]);

    // Create sample conversation
    const conversation = await Conversation.create({
      name: "Emergency Response Team",
      participants: [
        { user: existingUsers[0]._id, unreadCount: 0 },
        { user: existingUsers[1]._id, unreadCount: 2 }
      ],
      createdBy: existingUsers[0]._id,
      lastMessage: {
        content: "Emergency situation reported in District 5",
        sender: existingUsers[0]._id,
        timestamp: new Date()
      },
      isGroup: true
    });

    // Create sample messages
    const messages = await Message.create([
      { 
        conversation: conversation._id,
        sender: existingUsers[0]._id,
        content: "Emergency situation reported in District 5",
        messageType: "text",
        status: "delivered",
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      { 
        conversation: conversation._id,
        sender: existingUsers[1]._id,
        content: "Need backup at Central Hospital immediately",
        messageType: "text",
        status: "read",
        readBy: [existingUsers[0]._id],
        createdAt: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      },
      { 
        conversation: conversation._id,
        sender: existingUsers[0]._id,
        content: "Additional units dispatched to your location",
        messageType: "text",
        status: "sent",
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    ]);

    // Update conversation with latest message
    conversation.lastMessage = {
      content: messages[messages.length - 1].content,
      sender: messages[messages.length - 1].sender,
      timestamp: messages[messages.length - 1].createdAt
    };
    await conversation.save();

    console.log('✅ Sample data created successfully!');
    console.log(`- ${officers.length} police officers created`);
    console.log(`- ${emergencies.length} emergencies created`);
    console.log(`- ${firs.length} FIRs created`);
    console.log(`- ${reports.length} reports created`);
    console.log(`- 1 conversation created`);
    console.log(`- ${messages.length} messages created`);

    console.log('\n📋 Sample Data Overview:');
    console.log('Police Officers:');
    officers.forEach(officer => {
      console.log(`  - ${officer.name} (${officer.rank}) - Status: ${officer.status}`);
    });

    console.log('\nEmergencies:');
    emergencies.forEach(emergency => {
      console.log(`  - ${emergency.type.toUpperCase()} at ${emergency.location} - Status: ${emergency.status}`);
    });

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.error(`  - ${field}: ${error.errors[field].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
    console.log('\n🔗 MongoDB connection closed');
  }
};

// Run the script if called directly
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('🚀 Connected to MongoDB');
      console.log('📊 Creating sample data...\n');
      createSampleData();
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err);
      process.exit(1);
    });
}

module.exports = createSampleData;