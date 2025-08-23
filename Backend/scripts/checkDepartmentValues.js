const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const checkDepartmentValues = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye');
    
    // Get the User model schema
    const User = require('../models/User');
    const departmentPath = User.schema.path('department');
    
    if (departmentPath && departmentPath.enumValues) {
      console.log('✅ Valid department values:', departmentPath.enumValues);
    } else {
      console.log('❌ Department field does not have enum values or path not found');
      console.log('Department path:', departmentPath);
    }
    
  } catch (error) {
    console.error('Error checking department values:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkDepartmentValues();