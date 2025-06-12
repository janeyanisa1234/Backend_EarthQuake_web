const express = require('express');
const router = express.Router();
const { createConnection, getLatestEarthquakeData, calculateBangkokRisk, getRisksForDate, getTodayRiskAreas, getEarthquakesByDate } = require('../dbAPI/earthquake');
const { Dashboard } = require('../dbAPI/dashboard');

router.get('/connect', async (req, res) => {
  try {
    const connection = await createConnection();
    await connection.query('SELECT 1');
    await connection.end();
    res.send('Welcome to Express with MySQL');
  } catch (err) {
    console.error('MySQL connection error:', err);
    res.status(500).send('Cannot connect to MySQL database');
  }
});

router.get('/risk-date', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  try {
    const risks = await getRisksForDate(date);
    const riskAreas = risks.map(row => ({
      district_name: row.district_name,
      risk_level: row.risk_level,
      pga: row.pga,
      distance_km: row.distance_km,
      high_rise_count: row.high_rise_count,
      latitude: row.latitude,
      longitude: row.longitude,
      earthquake: {
        magnitude: row.magnitude,
        place: row.place,
        time: row.time
      }
    }));
    res.json(riskAreas); // ส่ง array ว่างถ้า risks.length === 0
  } catch (error) {
    console.error('Error fetching risk data:', error);
    res.status(500).json({ error: 'Failed to fetch risk data', message: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const quake = await getLatestEarthquakeData();
    res.json(quake); // ส่ง array ว่างถ้าไม่มีข้อมูล
  } catch (error) {
    console.error('Error fetching latest earthquake:', error);
    res.status(500).json({ error: 'Error fetching earthquake data', message: error.message });
  }
});

router.get('/test-mock', async (req, res) => {
  console.log('Testing with mock earthquake data');
  const quake = await getLatestEarthquakeData(true);
  res.json(quake);
});

router.get('/dashboard', async (req, res) => {
  try {
    const data = await Dashboard();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/today-risk-areas', async (req, res) => {
  try {
    const results = await getTodayRiskAreas();
    const riskAreas = results.map(row => ({
      district_name: row.district_name,
      risk_level: row.risk_level,
      pga: row.pga,
      distance_km: row.distance_km,
      high_rise_count: row.high_rise_count,
      latitude: row.latitude,
      longitude: row.longitude,
      earthquake: {
        magnitude: row.magnitude,
        place: row.place,
        time: row.time
      }
    }));
    res.json(riskAreas); // ส่ง array ว่างถ้า results.length === 0
  } catch (error) {
    console.error('Error fetching today\'s risk areas:', error);
    res.status(500).json({ message: 'Error fetching risk areas', error: error.message });
  }
});

router.get('/earthquakes', async (req, res) => {
  const { date } = req.query;
  try {
    const earthquakes = await getEarthquakesByDate(date);
    res.json(earthquakes); // ส่ง array ว่างถ้า earthquakes.length === 0
  } catch (error) {
    console.error('Error fetching earthquakes:', error);
    res.status(500).json({ message: 'Error fetching earthquake data', error: error.message });
  }
});

module.exports = router;