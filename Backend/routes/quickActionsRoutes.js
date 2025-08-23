const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const quickActionsController = require('../controllers/quickActionsController');

// POST /api/quick-actions/assign-officer - Assign officer to incident
router.post('/assign-officer', auth, quickActionsController.assignOfficer);

// POST /api/quick-actions/dispatch-team - Dispatch emergency team
router.post('/dispatch-team', auth, quickActionsController.dispatchTeam);

// POST /api/quick-actions/create-alert - Create system alert
router.post('/create-alert', auth, quickActionsController.createAlert);

module.exports = router;