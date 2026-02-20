export const routeCities = [
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
  { name: "Ooty", lat: 11.4064, lng: 76.6932 },
  { name: "Goa", lat: 15.2993, lng: 74.124 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Manali", lat: 32.2432, lng: 77.1892 },
  { name: "Leh", lat: 34.1526, lng: 77.5771 },
  { name: "Rishikesh", lat: 30.0869, lng: 78.2676 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Udaipur", lat: 24.5854, lng: 73.7125 }
];

export function getRouteCityByName(name) {
  return routeCities.find((city) => city.name === name) || null;
}

function squaredDistance(aLat, aLng, bLat, bLng) {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

export function getNearestRouteCity(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return routeCities.reduce((nearest, city) => {
    if (!nearest) return city;

    const nearestDistance = squaredDistance(nearest.lat, nearest.lng, lat, lng);
    const cityDistance = squaredDistance(city.lat, city.lng, lat, lng);
    return cityDistance < nearestDistance ? city : nearest;
  }, null);
}
