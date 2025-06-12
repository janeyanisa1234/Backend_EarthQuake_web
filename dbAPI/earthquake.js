const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const EXPORT_JSON_PATH = path.join(__dirname, 'export.json');

function generateRandomId(length = 25) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '6530300783',
      database: 'earthquake'
    });
    console.log('Connected to MySQL database: earthquake');
    return connection;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
    throw error;
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function countHighRiseBuildingsInDistrict(district, buildings, radiusKm = 10) {
  const highRiseBuildings = buildings.filter(building => {
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
    JOIN provinces p ON d.provinceCode = p.provinces_Num
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
            isHighRise: isHighRise
          });
        }
      }
    }

    if (missingLevelsBuildings.length > 0) {
      console.log('Buildings missing building:levels tag:');
      missingLevelsBuildings.forEach((building, index) => {
        console.log(`${index + 1}. ${building}`);
      });
    } else {
      console.log('All buildings have building:levels tag.');
    }

    console.log(`Loaded ${buildings.length} buildings from export.json, ${buildings.filter(b => b.isHighRise).length} are high-rise`);
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
  let latSum = 0, lonSum = 0, count = 0;
  for (const nodeId of nodes) {
    if (nodeMap[nodeId]) {
      latSum += nodeMap[nodeId].lat;
      lonSum += nodeMap[nodeId].lon;
      count++;
    }
  }
  if (count === 0) {
    console.warn(`No valid nodes found for way with nodes: ${nodes.slice(0, 0)}...`);
    return null;
  }
  return {
    latitude: Number((latSum / count).toFixed(6)),
    longitude: Number((lonSum / count).toFixed(6))
  };
}

function generateMockEarthquakeData() {
  const FIXED_TIMESTAMP = 1718074860000;
  return [{
    type: "Feature",
    properties: {
      mag: 8.9,
      place: "40km W of Bangkok, Thailand",
      time: FIXED_TIMESTAMP,
      id: generateRandomId(),
      type: "earthquake",
      isMock: true
    },
    geometry: {
      type: "Point",
      coordinates: [100.0018, 13.7563, 10.0]
    }
  }];
}

async function getLatestEarthquakeData(useMock = false) {
  if (useMock) {
    return generateMockEarthquakeData();
  }
  const connection = await createConnection();
  try {
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

    console.log('Fetching USGS data from:', `${url}?${params.toString()}`);

    const response = await fetch(`${url}?${params.toString()}`);
    console.log('Fetch response status:', response.status, response.ok);
    if (!response.ok) {
      console.warn(`HTTP error ${response.status}, using mock data`);
      return generateMockEarthquakeData();
    }

    const data = await response.json();
    console.log('USGS data features count:', data.features ? data.features.length : 0);
    const features = data.features || [];
    if (features.length === 0) {
      console.log('No recent earthquakes found from USGS, using mock data');
      return generateMockEarthquakeData();
    }

    const newEarthquakes = [];
    for (const feature of features) {
      const { time, place } = feature.properties;
      const [existing] = await connection.execute(
        'SELECT id FROM earthquakes WHERE time = ? AND place = ?',
        [time, place]
      );
      if (existing.length === 0) {
        newEarthquakes.push({
          type: "Feature",
          properties: {
            mag: feature.properties.mag,
            place: feature.properties.place,
            time: feature.properties.time,
            id: generateRandomId(),
            type: "earthquake",
            isMock: false
          },
          geometry: {
            type: "Point",
            coordinates: [
              feature.geometry.coordinates[0],
              feature.geometry.coordinates[1],
              feature.geometry.coordinates[2] || 10.0
            ]
          }
        });
      } else {
        console.log(`USGS earthquake at ${place} (time: ${time}) already processed, skipping`);
      }
    }
    return newEarthquakes.length > 0 ? newEarthquakes : generateMockEarthquakeData();
  } catch (error) {
    console.error('Error fetching earthquake data:', error.message);
    console.log('Using mock data as fallback');
    return generateMockEarthquakeData();
  } finally {
    await connection.end();
  }
}

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
      JSON.stringify({ isMock })
    ]);
    console.log(`Saved earthquake data: ${id}`);
    return id;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`Earthquake ID ${id} already exists, generating new ID`);
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
  const fS = 0;
  const logPGA = a + fM + fD + fS;
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
    const riskLevels = ['Light', 'Moderate', 'High', 'Very High', 'Severe'];
    const currentIndex = riskLevels.indexOf(riskLevel);
    if (currentIndex < riskLevels.length - 1) {
      riskLevel = riskLevels[currentIndex + 1];
    }
  }

  return riskLevel;
}

async function getExistingRiskResults(connection, earthquakeId) {
  const [results] = await connection.execute(`
    SELECT district_name, risk_level, high_rise_count
    FROM district_risks
    WHERE earthquake_id = ?
  `, [earthquakeId]);
  return results.map(row => ({
    district_name: row.district_name,
    risk_level: row.risk_level,
    high_rise_count: row.high_rise_count
  }));
}

async function calculateBangkokRisk(connection, earthquake) {
  const { mag, place, time, isMock } = earthquake.properties;
  const [longitude, latitude, depth] = earthquake.geometry.coordinates;

  let query, params;
  if (isMock) {
    query = 'SELECT id FROM earthquakes WHERE place = ? AND magnitude = ? AND JSON_EXTRACT(properties, "$.isMock") = ?';
    params = [place, mag, true];
  } else {
    query = 'SELECT id FROM earthquakes WHERE time = ? AND place = ?';
    params = [time, place];
  }
  const [existingEarthquake] = await connection.execute(query, params);

  let earthquakeId;
  if (existingEarthquake.length > 0) {
    earthquakeId = existingEarthquake[0].id;
    console.log(`Earthquake at ${place} (${isMock ? 'mock' : 'USGS'}) already exists with ID: ${earthquakeId}`);
  } else {
    earthquakeId = await saveEarthquakeData(connection, earthquake);
    console.log(`New earthquake saved with ID: ${earthquakeId}`);
  }

  const existingRisks = await getExistingRiskResults(connection, earthquakeId);
  if (existingRisks.length > 0) {
    console.log(`Risk results for earthquake ${earthquakeId} already exist, retrieving from database`);
    return { earthquake_id: earthquakeId, risk_districts: existingRisks };
  }

  console.log(`Calculating risk for earthquake ${earthquakeId}`);
  const k = 0.02;
  const c = 0.5;
  const maxRadius = k * Math.pow(10, c * mag);
  console.log(`Earthquake ID: ${earthquakeId}, Magnitude: ${mag}, Max Radius: ${maxRadius.toFixed(2)} km`);

  const districts = await getBangkokDistricts(connection);
  const buildings = await loadBuildingsFromJson();

  const riskResults = await Promise.all(districts.map(async (district) => {
    const distance = haversineDistance(latitude, longitude, district.latitude, district.longitude);
    const pga = calculatePGA(mag, distance, depth);
    const highRiseCount = countHighRiseBuildingsInDistrict(district, buildings, 10);
    const riskLevel = assessRiskLevel(pga, highRiseCount);

    const query = `
      INSERT INTO district_risks (earthquake_id, district_id, district_name, risk_level, pga, distance_km, high_rise_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(query, [
      earthquakeId,
      district.id,
      district.name,
      riskLevel,
      pga,
      distance,
      highRiseCount
    ]);

    return {
      district_name: district.name,
      risk_level: riskLevel,
      high_rise_count: highRiseCount
    };
  }));

  console.log(`Risk calculation completed for earthquake ${earthquakeId}`);
  return { earthquake_id: earthquakeId, risk_districts: riskResults };
}

async function getRisksForDate(date) {
  const connection = await createConnection();
  try {
    const [rows] = await connection.execute(`
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
    `, [date]);
    return rows;
  } catch (error) {
    console.error('Error fetching risks for date:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function getTodayRiskAreas() {
  const connection = await createConnection();
  try {
    let [results] = await connection.execute(`
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
    `);

    if (results.length === 0) {
      console.log('No risk data for today, fetching all risk areas');
      [results] = await connection.execute(`
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
      `);
    }

    return results;
  } catch (error) {
    console.error('Error fetching today\'s risk areas:', error.message);
    throw error;
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
    return results.map(row => ({
      id: row.id,
      magnitude: row.magnitude,
      place: row.place,
      time: row.time,
      latitude: row.latitude,
      longitude: row.longitude,
      depth: row.depth,
      isMock: JSON.parse(row.properties).isMock
    }));
  } catch (error) {
    console.error('Error fetching earthquakes:', error.message);
    throw error;
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
    const INTERVAL_MS = 1000;
    setInterval(executeMain, INTERVAL_MS);
  } catch (error) {
    console.error('Error in runContinuously:', error.message);
    setTimeout(runContinuously, 60 * 1000);
  }
}

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing database connection and exiting...');
  if (connection) {
    await connection.end();
    console.log('Database connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing database connection and exiting...');
  if (connection) {
    await connection.end();
    console.log('Database connection closed');
  }
  process.exit(0);
});

runContinuously();

module.exports = {
  createConnection,
  getLatestEarthquakeData,
  calculateBangkokRisk,
  getRisksForDate,
  getTodayRiskAreas,
  getEarthquakesByDate
};