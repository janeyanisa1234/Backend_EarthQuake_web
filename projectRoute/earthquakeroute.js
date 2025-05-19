const express = require('express');
const router = express.Router();
const { connection, getLatestEarthquakeData, calculateRiskAreaTest } = require('../dbAPI/earthquake');

// Route เช็คการเชื่อมต่อ db
router.get('/connect', (req, res) => {
    console.log('Testing connect route'); // Debug
    connection.query('SELECT 1', (err) => {
        if (err) {
            console.error('MySQL connection error:', err);
            res.status(500).send('Cannot connect to MySQL database');
        } else {
            res.send('Welcome to Express with MySQL');
        }
    });
});

// route ดึง usgs
router.get('/latest', async (req, res) => {
    console.log('Testing latest route'); // Debug
    const quake = await getLatestEarthquakeData();
    if (quake) {
        res.json(quake);
    } else {
        res.status(404).json({ message: 'ไม่มีข้อมูลแผ่่นดินไหวเวลานี้' });
    }
});

// Route ดึงข้อมูลจำลองเพื่อทดสอบ
router.get('/test-mock', async (req, res) => {
    console.log('Testing with mock earthquake data');
    // ส่ง true เพื่อบังคับให้ใช้ข้อมูลจำลอง
    const quake = await getLatestEarthquakeData(true);
    res.json(quake);
});

// Route ทดสอบคำนวณพื้นที่เสี่ยงด้วยข้อมูลจำลอง
/*router.get('/test-risk-area', async (req, res) => {
    console.log('Testing risk area calculation with mock data');
    const quake = await getLatestEarthquakeData(true);
    
    try {
        const riskAreas = [];
        for (const event of quake) {
            const results = await calculateRiskArea(event);
            riskAreas.push({
                earthquake_id: event.properties.id,
                place: event.properties.place,
                magnitude: event.properties.mag,
                coordinates: event.geometry.coordinates,
                risk_buildings: results
            });
        }
        res.json(riskAreas);
    } catch (error) {
        console.error('Error calculating risk area:', error);
        res.status(500).json({ message: 'Error calculating risk area', error: error.message });
    }
});*/

// Route to calculate risk area
router.get('/risk-area', async (req, res) => {
    console.log('Testing /risk-area route'); //checkdebug
    const quake = await getLatestEarthquakeData();
    if (!quake) {
        return res.status(404).json({ message: 'No earthquake data available' });
    }

    try {
        const riskAreas = [];
        for (const event of quake) {
            const results = await calculateRiskArea(event);
            riskAreas.push({
                earthquake_id: event.properties.id,
                place: event.properties.place,
                magnitude: event.properties.mag,
                coordinates: event.geometry.coordinates,
                risk_buildings: results
            });
        }
        res.json(riskAreas);
    } catch (error) {
        console.error('Error calculating risk area:', error);
        res.status(500).json({ message: 'Error calculating risk area' });
    }
});


// Route ดึงข้อมูลจำลองเพื่อทดสอบ
router.get('/test-mock', async (req, res) => {
    console.log('Testing with mock earthquake data');
    const quake = await getLatestEarthquakeData(true);
    res.json(quake);
});

// Route ทดสอบการคำนวณพื้นที่เสี่ยง (ไม่บันทึก ไม่ใช้ตึก)
router.get('/test-risk-area-calc', async (req, res) => {
    console.log('Testing risk area calculation with mock data');
    const quake = await getLatestEarthquakeData(true);
    
    try {
        const riskAreas = [];
        for (const event of quake) {
            const result = calculateRiskAreaTest(event);
            riskAreas.push(result);
        }
        res.json(riskAreas);
    } catch (error) {
        console.error('Error calculating risk area:', error);
        res.status(500).json({ message: 'Error calculating risk area', error: error.message });
    }
});

module.exports = router;