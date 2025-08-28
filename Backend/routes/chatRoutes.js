// Backend/routes/chatRoutes.js

const express = require('express');

const router = express.Router();



// keep this super simple until you re-hook chat features



router.get('/ping', (req, res) => res.json({ ok: true, where: '/api/chat/ping' }));




module.exports = router;