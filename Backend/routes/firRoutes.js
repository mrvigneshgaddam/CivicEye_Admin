const express = require('express');
const router = express.Router();
const Report = require('../models/Report'); // Import the Report model

// Get all FIRs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { firId: { $regex: search, $options: 'i' } },
        { 'complainant.name': { $regex: search, $options: 'i' } },
        { incidentType: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get data with pagination
    const reports = await Report.find(query)
      .sort({ reportedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    // Get total count for pagination
    const totalItems = await Report.countDocuments(query);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching FIR data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get FIR statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const pending = await Report.countDocuments({ status: 'Pending' });
    const resolved = await Report.countDocuments({ status: 'Resolved' });
    const urgent = await Report.countDocuments({ status: 'Urgent' });
    
    res.json({
      success: true,
      data: {
        total,
        pending,
        resolved,
        urgent
      }
    });
  } catch (error) {
    console.error('Error fetching FIR stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single FIR by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'FIR not found'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching FIR:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete FIR by ID
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'FIR not found'
      });
    }
    
    res.json({
      success: true,
      message: 'FIR deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FIR:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;