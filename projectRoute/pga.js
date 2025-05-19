// routes/pga.js

const express = require('express');
const router = express.Router();
const { calculatePGA } = require('../dbAPI/pga');

// route ทดสอบการคำนวณ PGA
router.get('/test', (req, res) => {
  const testInput = {
    M: 6.5,
    R: 20,
    SS: 1,
    NS: 0,
  };

  const pga = calculatePGA(testInput);
  res.json({ input: testInput, PGA_g: pga.toFixed(4) });
});

module.exports = router;
