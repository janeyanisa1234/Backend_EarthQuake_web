require('dotenv').config();
const { createConnection } = require('./db.js');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const mock = require('../mockupData/mockupData.js');
console.log("DEBUG mock =", mock);


// ⭐ mockup data
const { generateMockEarthquake } = require('../mockupData/mockupData');


const EXPORT_JSON_PATH = path.join(__dirname, 'export.json');

function generateRandomId(length = 25) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function countHighRiseBuildingsInDistrict(district, buildings, radiusKm = 10) {
  const highRiseBuildings = buildings.filter((building) => {
    const distance = haversineDistance(
      district.latitude,
      district.longitude,
      building.latitude,
      building.longitude
    );
    return building.isHighRise && distance <= radiusKm;
  });
  return highRiseBuildings.length;
}

async function getBangkokDistricts(connection) {
  const [results] = await connection.execute(`
    SELECT d.id, d.name, d.latitude, d.longitude
    FROM districts d
    JOIN provinces p ON d.provincesCode = p.provinces_Num
    WHERE p.provinces_Num = 10
  `);

  if (results.length === 0) {
    console.warn('No districts found for Bangkok (provinceCode = 10)');
  } else {
    console.log(`Found ${results.length} districts in Bangkok`);
  }
  return results;
}

async function loadBuildingsFromJson() {
  try {
    const data = await fs.readFile(EXPORT_JSON_PATH, 'utf8');
    const json = JSON.parse(data);
    const buildings = [];
    const missingLevelsBuildings = [];

    for (const element of json.elements) {
      if (element.type === 'way' && element.tags && element.tags.building) {
        const centroid = await getCentroidCoordinates(element.nodes, json);
        if (centroid) {
          const height = parseFloat(element.tags.height) || 0;
          const levels = parseInt(element.tags['building:levels']) || 0;

          if (!element.tags['building:levels']) {
            missingLevelsBuildings.push(element.tags.name || `Building_${element.id}`);
          }

          const isHighRise = levels >= 8;

          buildings.push({
            name: element.tags.name || `Building_${element.id}`,
            latitude: centroid.latitude,
            longitude: centroid.longitude,
            height_m: height,
            levels: levels,
            isHighRise: isHighRise,
          });
        }
      }
    }

    if (missingLevelsBuildings.length > 0) {
      console.log('Buildings missing building:levels tag:');
      missingLevelsBuildings.forEach((building, index) =>
        console.log(`${index + 1}. ${building}`)
      );
    }

    console.log(
      `Loaded ${buildings.length} buildings, ${
        buildings.filter((b) => b.isHighRise).length
      } are high-rise`
    );
    return buildings;
  } catch (error) {
    console.error('Error reading export.json:', error.message);
    return [];
  }
}

async function getCentroidCoordinates(nodes, jsonData) {
  const nodeMap = {};
  for (const element of jsonData.elements) {
    if (element.type === 'node' && element.id && element.lat && element.lon) {
      nodeMap[element.id] = { lat: element.lat, lon: element.lon };
    }
  }

  let latSum = 0,
    lonSum = 0,
    count = 0;

  for (const nodeId of nodes) {
    if (nodeMap[nodeId]) {
      latSum += nodeMap[nodeId].lat;
      lonSum += nodeMap[nodeId].lon;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    latitude: Number((latSum / count).toFixed(6)),
    longitude: Number((lonSum / count).toFixed(6)),
  };
}

/*  
─────────────────────────────────────────────
⭐ getLatestEarthquakeData() ใช้ mock 100%
─────────────────────────────────────────────
*/
async function getLatestEarthquakeData() {
  console.log('✔ Using mock earthquake data only');
  return generateMockEarthquake();

  /*
  // ⭐ ถ้าต้องการกลับไปใช้ USGS
  // uncomment ด้านล่างได้เลย
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?...';
  */
}

/*  
─────────────────────────────────────────────
ส่วนระบบประมวลผล/บันทึกข้อมูลเหมือนเดิม
─────────────────────────────────────────────
*/
async function saveEarthquakeData(connection, earthquake) {
  const { mag, place, time, isMock } = earthquake.properties;
  const [longitude, latitude, depth] = earthquake.geometry.coordinates;

  const id = generateRandomId();
  const query = `
    INSERT INTO earthquakes (id, magnitude, place, time, latitude, longitude, depth, properties)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await connection.execute(query, [
      id,
      mag,
      place,
      time,
      latitude,
      longitude,
      depth,
      JSON.stringify({ isMock }),
    ]);

    console.log(`Saved earthquake data: ${id}`);
    return id;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return await saveEarthquakeData(connection, earthquake);
    }
    throw error;
  }
}

function calculatePGA(magnitude, distance, depth) {
  const a = -1.0;
  const b = 0.5;
  const c = -1.2;
  const h = 5.0;

  const adjustedDistance = Math.sqrt(distance * distance + depth * depth + h * h);
  const fM = b * (magnitude - 6.0);
  const fD = c * Math.log10(adjustedDistance);
  const logPGA = a + fM + fD;

  return Number(Math.pow(10, logPGA).toFixed(4));
}

function assessRiskLevel(pga, highRiseCount, highRiseThreshold = 5) {
  let riskLevel;

  if (pga >= 0.34) riskLevel = 'Severe';
  else if (pga >= 0.18) riskLevel = 'Very High';
  else if (pga >= 0.092) riskLevel = 'High';
  else if (pga >= 0.039) riskLevel = 'Moderate';
  else if (pga >= 0.014) riskLevel = 'Light';
  else riskLevel = 'Minimal';

  if (highRiseCount >= highRiseThreshold && riskLevel !== 'Minimal') {
    const levels = ['Light', 'Moderate', 'High', 'Very High', 'Severe'];
    const index = levels.indexOf(riskLevel);
    if (index < levels.length - 1) {
      riskLevel = levels[index + 1];
    }
  }

  return riskLevel;
}

async function getExistingRiskResults(connection, earthquakeId) {
  const [results] = await connection.execute(
    `
    SELECT district_name, risk_level, high_rise_count
    FROM district_risks
    WHERE earthquake_id = ?
  `,
    [earthquakeId]
  );

  return results.map((row) => ({
    district_name: row.district_name,
    risk_level: row.risk_level,
    high_rise_count: row.high_rise_count,
  }));
}

async function calculateBangkokRisk(connection, earthquake) {
  const { mag, place, time, isMock } = earthquake.properties;
  const [longitude, latitude, depth] = earthquake.geometry.coordinates;

  let earthquakeId = await saveEarthquakeData(connection, earthquake);

  const existingRisks = await getExistingRiskResults(connection, earthquakeId);
  if (existingRisks.length > 0) {
    return { earthquake_id: earthquakeId, risk_districts: existingRisks };
  }

  const districts = await getBangkokDistricts(connection);
  const buildings = await loadBuildingsFromJson();

  const riskResults = await Promise.all(
    districts.map(async (district) => {
      const distance = haversineDistance(latitude, longitude, district.latitude, district.longitude);
      const pga = calculatePGA(mag, distance, depth);

      const highRiseCount = countHighRiseBuildingsInDistrict(district, buildings, 10);

      const riskLevel = assessRiskLevel(pga, highRiseCount);

      await connection.execute(
        `
        INSERT INTO district_risks 
        (earthquake_id, district_id, district_name, risk_level, pga, distance_km, high_rise_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          earthquakeId,
          district.id,
          district.name,
          riskLevel,
          pga,
          distance,
          highRiseCount,
        ]
      );

      return {
        district_name: district.name,
        risk_level: riskLevel,
        high_rise_count: highRiseCount,
      };
    })
  );

  return { earthquake_id: earthquakeId, risk_districts: riskResults };
}

async function getRisksForDate(date) {
  const connection = await createConnection();
  try {
    const [rows] = await connection.execute(
      `
      SELECT 
        dr.district_name,
        dr.risk_level,
        dr.pga,
        dr.distance_km,
        dr.high_rise_count,
        d.latitude,
        d.longitude,
        e.magnitude,
        e.place,
        e.time
      FROM district_risks dr
      JOIN districts d ON dr.district_id = d.id
      JOIN earthquakes e ON dr.earthquake_id = e.id
      WHERE DATE(dr.created_at) = ?
    `,
      [date]
    );
    return rows;
  } finally {
    await connection.end();
  }
}

async function getTodayRiskAreas() {
  const connection = await createConnection();
  try {
    let [results] = await connection.execute(
      `
      SELECT 
        dr.district_name,
        dr.risk_level,
        dr.pga,
        dr.distance_km,
        dr.high_rise_count,
        d.latitude,
        d.longitude,
        e.magnitude,
        e.place,
        e.time
      FROM district_risks dr
      JOIN districts d ON dr.district_id = d.id
      JOIN earthquakes e ON dr.earthquake_id = e.id
      WHERE DATE(dr.created_at) = CURDATE()
    `
    );

    if (results.length === 0) {
      [results] = await connection.execute(
        `
        SELECT 
          dr.district_name,
          dr.risk_level,
          dr.pga,
          dr.distance_km,
          dr.high_rise_count,
          d.latitude,
          d.longitude,
          e.magnitude,
          e.place,
          e.time
        FROM district_risks dr
        JOIN districts d ON dr.district_id = d.id
        JOIN earthquakes e ON dr.earthquake_id = e.id
      `
      );
    }

    return results;
  } finally {
    await connection.end();
  }
}

async function getEarthquakesByDate(date = null) {
  const connection = await createConnection();
  try {
    let query = `
      SELECT 
        id,
        magnitude,
        place,
        time,
        latitude,
        longitude,
        depth,
        properties
      FROM earthquakes
    `;
    let params = [];

    if (date) {
      query += ' WHERE DATE(created_at) = ?';
      params = [date];
    }

    const [results] = await connection.execute(query, params);

    return results.map((row) => ({
      id: row.id,
      magnitude: row.magnitude,
      place: row.place,
      time: row.time,
      latitude: row.latitude,
      longitude: row.longitude,
      depth: row.depth,
      isMock: JSON.parse(row.properties).isMock,
    }));
  } finally {
    await connection.end();
  }
}

async function getRisksByEarthquakeId(earthquakeId) {
  const connection = await createConnection();
  try {
    const [rows] = await connection.execute(
      `
      SELECT 
        dr.district_name,
        dr.risk_level,
        dr.pga,
        dr.distance_km,
        dr.high_rise_count,
        d.latitude,
        d.longitude,
        e.magnitude,
        e.place,
        e.time
      FROM district_risks dr
      JOIN districts d ON dr.district_id = d.id
      JOIN earthquakes e ON dr.earthquake_id = e.id
      WHERE dr.earthquake_id = ?
    `,
      [earthquakeId]
    );
    return rows;
  } finally {
    await connection.end();
  }
}

async function runContinuously() {
  let connection;

  try {
    connection = await createConnection();

    const executeMain = async () => {
      try {
        console.log(`Running earthquake check at ${new Date().toISOString()}`);

        // ⭐ mock 100%
        const earthquakes = await getLatestEarthquakeData();

        if (earthquakes.length === 0) {
          console.log('No new earthquakes to process');
          return;
        }

        for (const earthquake of earthquakes) {
          const result = await calculateBangkokRisk(connection, earthquake);
          console.log(`Earthquake: ${result.earthquake_id}`);
        }
      } catch (error) {
        console.error('Error in executeMain:', error.message);
      }
    };

    await executeMain();
    setInterval(executeMain, 1000);

  } catch (error) {
    console.error('Error in runContinuously:', error.message);
    setTimeout(runContinuously, 60000);
  }
}

runContinuously();

module.exports = {
  createConnection,
  getLatestEarthquakeData,
  calculateBangkokRisk,
  getRisksForDate,
  getTodayRiskAreas,
  getEarthquakesByDate,
  getRisksByEarthquakeId,
};
