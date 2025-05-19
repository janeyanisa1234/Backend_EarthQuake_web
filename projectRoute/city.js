const express = require('express');
const router = express.Router();

// สมมุติใช้ข้อมูล provinces จากไฟล์ JSON
const { saveProvincesAndDistricts } = require('../dbAPI/city');

router.get('/fetch-provinces', (req, res) => {
  saveProvincesAndDistricts((err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

module.exports = router;




