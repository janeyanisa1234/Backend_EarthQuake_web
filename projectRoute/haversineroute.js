const express = require('express');
const router = express.Router();
const { calculateHaversine } = require('../dbAPI/haversine');

// GET: ทดสอบการคำนวณระยะทาง Haversine
router.get('/test', (req, res) => {
    const testInput = {
        coord1: { lat: 13.7563, lon: 100.5018 }, // กรุงเทพ
        coord2: { lat: 18.7883, lon: 98.9853 }   // เชียงใหม่
    };

    try {
        const distance = calculateHaversine(testInput);
        res.json({
            input: testInput,
            distance: {
                meters: distance.meters,
                kilometers: distance.kilometers
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'ข้อผิดพลาดในการคำนวณ',
            message: error.message
        });
    }
});

// POST: คำนวณระยะทางจากพิกัดที่ส่งมา Test posman แล้ว
router.post('/calculate', (req, res) => {
    const { coord1, coord2 } = req.body;

    // ตรวจสอบข้อมูลนำเข้า
    if (!coord1 || !coord2 || 
        !coord1.hasOwnProperty('lat') || !coord1.hasOwnProperty('lon') ||
        !coord2.hasOwnProperty('lat') || !coord2.hasOwnProperty('lon')) {
        return res.status(400).json({
            error: 'พิกัดไม่ถูกต้อง กรุณาระบุ lat และ lon สำหรับทั้งสองจุด'
        });
    }

    try {
        const distance = calculateHaversine({ coord1, coord2 });
        res.json({
            input: { coord1, coord2 },
            distance: {
                meters: distance.meters,
                kilometers: distance.kilometers
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'ข้อผิดพลาดในการคำนวณ',
            message: error.message
        });
    }
});

module.exports = router;