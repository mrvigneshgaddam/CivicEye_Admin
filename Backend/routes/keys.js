// Backend/routes/keys.js
const express = require("express");
const router = express.Router();
const Police = require("../models/Police");

// ✅ Save or update private/public key for an officer
router.post("/save", async (req, res) => {
  try {
    const { firebaseUid, privateKey, publicKey } = req.body;
    if (!firebaseUid || !privateKey || !publicKey) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const officer = await Police.findOneAndUpdate(
      { firebaseUid },
      { privateKey, publicKey, updatedAt: Date.now() },
      { new: true }
    );

    if (!officer) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }

    return res.json({ success: true, officer });
  } catch (err) {
    console.error("Error saving keys:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get keys by firebaseUid
router.get("/:firebaseUid", async (req, res) => {
  try {
    const officer = await Police.findOne({ firebaseUid: req.params.firebaseUid });
    if (!officer) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }
    return res.json({ 
      success: true, 
      privateKey: officer.privateKey, 
      publicKey: officer.publicKey 
    });
  } catch (err) {
    console.error("Error fetching keys:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
