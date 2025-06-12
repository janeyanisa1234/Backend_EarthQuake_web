const express = require('express');
const app = express();
const cors = require('cors');
const earthquakeRoutes = require('./projectRoute/earthquakeroute'); // แก้ไขตรงนี้
const mongoose = require('mongoose');
const pga = require('./projectRoute/pga');
const building = require('./projectRoute/building');
const haversineRoutes = require('./projectRoute/haversineroute');
const citythailand = require('./projectRoute/city');
const telegram = require('./projectRoute/telegramroute')
//const earthquakes = require('./projectRoute/earthquakeroute');
//const pgaRoute = require('./bdAPI/pga');
app.use(express.json());
mongoose.Promise = global.Promise;
const PORT = process.env.PORT || 5000;

// เส้นทางหลัก
app.get('/', (req, res) => {
    res.send('สวัสดี Express!!!');
});

app.use(cors());
// เส้นทางทั้งหมด
app.use('/earthquakes', earthquakeRoutes); 
app.use('/city', citythailand);
app.use('/haversine', haversineRoutes);
app.use('/pga', pga);
app.use('/building', building);
//app.use('/telegram', telegram);

app.listen(PORT, ()=> console.log(`Server running at http://localhost:${PORT}`));