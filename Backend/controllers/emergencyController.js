const Emergency = require('../models/Emergency');

// controllers/emergencyController.js


// POST /api/emergency/report
exports.reportEmergency = async (req, res) => {
  try {
    const { type, location, description } = req.body;
    const emergency = new Emergency({ type, location, description });
    await emergency.save();
    res.json({
      message: "Emergency reported successfully",
      data: emergency
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/emergency/all
exports.getEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find();
    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
