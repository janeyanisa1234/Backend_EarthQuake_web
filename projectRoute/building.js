const express = require('express');
const router = express.Router();
const data = require('../dbAPI/export.json');


// ดึงข้อมูลตึกที่ export ออกมาเป็น JSON มาแสดง
router.get('/fromfile', (req, res) => {
  res.json(data);
});

module.exports = router;
