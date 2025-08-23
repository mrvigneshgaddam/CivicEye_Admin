// controllers/firController.js
const FIR = require('../models/firModel');

// Create new FIR
exports.createFir = async (req, res, next) => {
  try {
    const fir = await FIR.create(req.body);
    res.status(201).json(fir);
  } catch (error) {
    next(error);
  }
};

// Get all FIRs
exports.getAllFirs = async (req, res, next) => {
  try {
    const firs = await FIR.find();
    res.status(200).json(firs);
  } catch (error) {
    next(error);
  }
};

// Get FIR by ID
exports.getFirById = async (req, res, next) => {
  try {
    const fir = await FIR.findById(req.params.id);
    if (!fir) {
      return res.status(404).json({ message: 'FIR not found' });
    }
    res.status(200).json(fir);
  } catch (error) {
    next(error);
  }
};

// Update FIR by ID
exports.updateFir = async (req, res, next) => {
  try {
    const fir = await FIR.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fir) {
      return res.status(404).json({ message: 'FIR not found' });
    }
    res.status(200).json(fir);
  } catch (error) {
    next(error);
  }
};

// Delete FIR by ID
exports.deleteFir = async (req, res, next) => {
  try {
    const fir = await FIR.findByIdAndDelete(req.params.id);
    if (!fir) {
      return res.status(404).json({ message: 'FIR not found' });
    }
    res.status(200).json({ message: 'FIR deleted successfully' });
  } catch (error) {
    next(error);
  }
};
