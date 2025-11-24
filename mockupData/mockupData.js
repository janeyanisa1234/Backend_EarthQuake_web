// mockuptodata
function generateMockEarthquake() {
  const FIXED_TIMESTAMP = 1749999120000;

  return [{
    type: "Feature",
    properties: {
      mag: 8.5,
      place: "Mock Earthquake Center",
      time: FIXED_TIMESTAMP,
      id: "MOCK_EQ_01",
      type: "earthquake",
      isMock: true
    },
    geometry: {
      type: "Point",
      coordinates: [100.5018, 13.7563, 12.0] // lat, lng, depth
    }
  }];
}

module.exports = { generateMockEarthquake };
