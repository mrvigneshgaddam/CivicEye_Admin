// controllers/officerController.js

const Officer = require('../models/Police'); // import police.js model

// Create new officer
exports.createOfficer = async (req, res) => {
    try {
        const officer = new Officer(req.body);
        await officer.save();
        res.status(201).json(officer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all officers
exports.getAllOfficers = async (req, res) => {
    try {
        const officers = await Officer.find();
        res.status(200).json(officers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get officer by ID
exports.getOfficerById = async (req, res) => {
    try {
        const officer = await Officer.findById(req.params.id);
        if (!officer) {
            return res.status(404).json({ message: 'Officer not found' });
        }
        res.status(200).json(officer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update officer
exports.updateOfficer = async (req, res) => {
    try {
        const officer = await Officer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!officer) {
            return res.status(404).json({ message: 'Officer not found' });
        }
        res.status(200).json(officer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete officer
exports.deleteOfficer = async (req, res) => {
    try {
        const officer = await Officer.findByIdAndDelete(req.params.id);
        if (!officer) {
            return res.status(404).json({ message: 'Officer not found' });
        }
        res.status(200).json({ message: 'Officer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
