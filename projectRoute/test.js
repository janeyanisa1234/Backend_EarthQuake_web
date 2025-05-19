const express = require('express');
const router = express.Router();
const { getLatestEarthquakeData } = require('../dbAPI/test');

router.get('/latest', async (req, res) => {
    const quake = await getLatestEarthquakeData();
    if (quake) {
        res.json(quake);
    } else {
        res.status(404).json({ message: 'ไม่มีข้อมูลแผ่นดินไหวเกิดขึ้นในขณะนี้' });
    }
});


module.exports = router;
