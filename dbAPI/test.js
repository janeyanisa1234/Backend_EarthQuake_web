// services/earthquakeService.js

async function getLatestEarthquakeData() {
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    const end = new Date(); // เวลาปัจจุบัน
    const start = new Date(end.getTime() -  5 * 60 * 1000); // ย้อนหลัง 5 นาที

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
        return features.length > 0 ? features : null;
    } catch (error) {
        console.error('Error fetching earthquake data:', error.message);
        return null;
    }
}

module.exports = {
    getLatestEarthquakeData
};
