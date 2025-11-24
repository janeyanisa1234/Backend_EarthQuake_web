function calculateHaversine({ coord1, coord2 }) {
  const R = 6371e3; // รัศมีโลก (เมตร)
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lon - coord1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const meters = R * c;
  return {
    meters,
    kilometers: meters / 1000
  };
}

module.exports = { calculateHaversine }; //  export แบบนี้
