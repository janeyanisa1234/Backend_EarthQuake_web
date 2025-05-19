const mysql = require('mysql2');

//ไม่ใช้ mongo แล้ว
//mongodb+srv://jane:janejane@jane.bskykhq.mongodb.net/
//mongodb+srv://jane:janejane@jane.bskykhq.mongodb.net/?retryWrites=true&w=majority&appName=jane
// เชื่อมต่อ MySQL

// เชื่อมต่อ MySQL (ไม่ใช้ในการคำนวณทดสอบ)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '6530300783',
    database: 'earthquake'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// ฟังก์ชัน mockup ข้อมูลแผ่นดินไหวเพื่อทดสอบ
function generateMockEarthquakeData() {
    const now = new Date();
    return [
        {
            type: "Feature",
            properties: {
                mag: 6.5,
                place: "150km W of Bangkok, Thailand",
                time: now.getTime(),
                id: "th:mock1",
                type: "earthquake"
            },
            geometry: {
                type: "Point",
                coordinates: [99.5018, 13.7563, 10.0]
            },
            id: "th:mock1"
        },
        {
            type: "Feature",
            properties: {
                mag: 5.2,
                place: "50km E of Chiang Mai, Thailand",
                time: now.getTime() - 1000 * 60 * 30,
                id: "th:mock2",
                type: "earthquake"
            },
            geometry: {
                type: "Point",
                coordinates: [99.1234, 18.7839, 8.5]
            },
            id: "th:mock2"
        },
        {
            type: "Feature",
            properties: {
                mag: 7.0,
                place: "200km N of Phuket, Thailand",
                time: now.getTime() - 1000 * 60 * 60,
                id: "th:mock3",
                type: "earthquake"
            },
            geometry: {
                type: "Point",
                coordinates: [98.3167, 9.9637, 15.0]
            },
            id: "th:mock3"
        }
    ];
}

// ดึงข้อมูลแผ่นดินไหวจาก USGS หรือใช้ mockup
async function getLatestEarthquakeData(useMockData = false) {
    if (useMockData) {
        console.log('Using mock earthquake data for testing');
        return generateMockEarthquakeData();
    }

    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
    const end = new Date();
    const start = new Date(end.getTime() - 5 * 60 * 1000);

    const params = new URLSearchParams({
        format: 'geojson',
        starttime: start.toISOString(),
        endtime: end.toISOString(),
        orderby: 'time',
        limit: '100'
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        const features = data.features;
        if (features.length === 0) {
            console.log('No recent earthquakes found from USGS, using mock data');
            return generateMockEarthquakeData();
        }
        return features;
    } catch (error) {
        console.error('Error fetching earthquake data:', error.message);
        console.log('Falling back to mock earthquake data');
        return generateMockEarthquakeData();
    }
}

// ฟังก์ชันทดสอบการคำนวณพื้นที่เสี่ยง (ไม่บันทึก ไม่ใช้ตึก)
function calculateRiskAreaTest(earthquake) {
    const { id, mag, place } = earthquake.properties;
    const [longitude, latitude, depth] = earthquake.geometry.coordinates;

    // คำนวณรัศมีเสี่ยง
    const k = 0.02;
    const c = 0.5;
    const maxRadius = k * Math.pow(10, c * mag);

    // ทดสอบ PGA และ Risk Level ที่ระยะต่าง ๆ (5, 10, 20 กม.)
    const testDistances = [5, 10, 20];
    const riskResults = testDistances.map(distance => {
        const pga = calculatePGA(mag, distance, depth);
        const riskLevel = assessRiskLevel(pga);
        const sWaveTime = distance / 3.5; // V_S = 3.5 กม./วินาที
        return {
            distance,
            pga,
            risk_level: riskLevel,
            s_wave_time: sWaveTime
        };
    });

    return {
        earthquake_id: id,
        place,
        magnitude: mag,
        coordinates: { latitude, longitude, depth },
        max_radius_km: Number(maxRadius.toFixed(2)),
        risk_zones: riskResults
    };
}

// ฟังก์ชันคำนวณ PGA (Boore & Atkinson, 2008)
function calculatePGA(magnitude, distance, depth) {
    const a = -1.0; // ปรับให้สมจริง
    const b = 0.5;
    const c = -1.2;
    const h = 5.0;
    const adjustedDistance = Math.sqrt(distance * distance + depth * depth + h * h);
    const fM = b * (magnitude - 6.0);
    const fD = c * Math.log10(adjustedDistance); // เปลี่ยนจาก ln เป็น log10
    const fS = 0;
    const logPGA = a + fM + fD + fS;
    const pga = Math.pow(10, logPGA);
    return Number(pga.toFixed(4));
}

// ฟังก์ชันกำหนด Risk Level
function assessRiskLevel(pga) {
    if (pga >= 0.34) return 'Severe';
    if (pga >= 0.18) return 'Very High';
    if (pga >= 0.092) return 'High';
    if (pga >= 0.039) return 'Moderate';
    if (pga >= 0.014) return 'Light';
    return 'Minimal';
}

module.exports = {
    connection,
    getLatestEarthquakeData,
    calculateRiskAreaTest
};