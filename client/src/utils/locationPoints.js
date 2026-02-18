const CITY_POINTS = {
  Bengaluru: [
    "Majestic Bus Stand",
    "Kempegowda Airport",
    "MG Road Metro Station",
    "Electronic City"
  ],
  Mysuru: [
    "Mysuru Bus Stand",
    "Mysuru Railway Station",
    "Kuvempunagar",
    "Mysuru Palace Gate"
  ],
  Ooty: ["Ooty Bus Stand", "Ooty Lake", "Botanical Garden Gate", "Doddabetta Junction"],
  Goa: ["Panaji Bus Stand", "Mapusa Market", "Calangute Circle", "Madgaon Station"],
  Manali: ["Mall Road Manali", "Manali Bus Stand", "Vashisht Temple Road", "Old Manali"],
  Leh: ["Leh Main Market", "Leh Airport", "Changspa Road", "Leh Bus Stand"],
  Jaipur: ["Sindhi Camp Bus Stand", "Jaipur Junction", "Bani Park", "Hawa Mahal Circle"],
  Mumbai: ["Andheri Station", "Bandra Terminus", "Dadar TT", "Chhatrapati Shivaji Terminal"],
  Kochi: ["Ernakulam Junction", "Vyttila Hub", "Fort Kochi Jetty", "Kakkanad"],
  Pune: ["Shivajinagar", "Pune Station", "Hinjewadi Phase 1", "Swargate"],
  Udaipur: ["Udaipur Bus Stand", "Udaipur Railway Station", "Fateh Sagar", "City Palace Road"],
  Rishikesh: ["Rishikesh Bus Stand", "Tapovan", "Laxman Jhula", "Triveni Ghat"]
};

const DEFAULT_POINTS = ["City Center", "Main Bus Stand", "Railway Station", "Airport"];

function normalize(text) {
  return (text || "").trim().toLowerCase();
}

export function getCityOptions() {
  return Object.keys(CITY_POINTS);
}

export function getPointsByCity(city) {
  if (!city) return DEFAULT_POINTS;
  return CITY_POINTS[city] || DEFAULT_POINTS;
}

export function composeLocation(city, point) {
  const safeCity = (city || "").trim();
  const safePoint = (point || "").trim();
  if (safeCity && safePoint) return `${safeCity} - ${safePoint}`;
  if (safeCity) return safeCity;
  return safePoint;
}

function resolveCity(cityCandidate, fallbackCity) {
  const options = getCityOptions();
  const normalizedCandidate = normalize(cityCandidate);
  const exact = options.find((city) => normalize(city) === normalizedCandidate);
  if (exact) return exact;

  const normalizedFallback = normalize(fallbackCity);
  const fallback = options.find((city) => normalize(city) === normalizedFallback);
  if (fallback) return fallback;

  return options[0];
}

export function parseLocation(locationText, fallbackCity) {
  const value = (locationText || "").trim();
  if (!value) {
    const city = resolveCity("", fallbackCity);
    return { city, point: getPointsByCity(city)[0] };
  }

  const [rawCity, ...rest] = value.split(" - ");
  const city = resolveCity(rawCity, fallbackCity);
  const points = getPointsByCity(city);
  const typedPoint = rest.join(" - ").trim();

  if (typedPoint) {
    const matchedPoint = points.find((point) => normalize(point) === normalize(typedPoint));
    return { city, point: matchedPoint || typedPoint };
  }

  const foundPoint = points.find((point) => normalize(value).includes(normalize(point)));
  return { city, point: foundPoint || points[0] };
}

