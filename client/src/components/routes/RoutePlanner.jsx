import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap
} from "react-leaflet";
import api from "../../api/client";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getNearestRouteCity, getRouteCityByName, routeCities } from "../../utils/routeCities";

const popularRoutes = [
  ["Bengaluru", "Ooty"],
  ["Manali", "Leh"],
  ["Mumbai", "Goa"],
  ["Jaipur", "Udaipur"]
];

function getLocationErrorMessage(error) {
  if (!error) return "Unable to detect location. Please choose city manually.";
  if (error.code === 1) return "Location permission denied. Enable it and try again.";
  if (error.code === 2) return "Location unavailable right now. Try again in a few seconds.";
  if (error.code === 3) return "Location request timed out. Please try again.";
  return "Unable to detect location. Please choose city manually.";
}

async function fetchApproximateLocation() {
  const sources = ["https://ipapi.co/json/", "https://ipwho.is/"];

  for (const url of sources) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) continue;

      const payload = await response.json();
      const lat = Number(payload.latitude ?? payload.lat);
      const lng = Number(payload.longitude ?? payload.lon ?? payload.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    } catch {
      // Try next provider.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

function FitRouteBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length < 2) return;
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);

  return null;
}

function MapResizer({ watchKey }) {
  const map = useMap();

  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timeoutId = setTimeout(() => map.invalidateSize(), 260);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, [map, watchKey]);

  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  return null;
}

export default function RoutePlanner() {
  const [fromCity, setFromCity] = useState("Bengaluru");
  const [toCity, setToCity] = useState("Ooty");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [customFromPoint, setCustomFromPoint] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const cityFromPoint = getRouteCityByName(fromCity) || routeCities[0];
  const fromPoint = customFromPoint || cityFromPoint;
  const toPoint = getRouteCityByName(toCity) || routeCities[1];
  const fromMarkerLabel = customFromPoint ? "My Location" : fromCity;

  const selectedRoute = useMemo(() => {
    const routes = routeData?.routes || [];
    return routes.find((route) => route.id === selectedRouteId) || routes[0] || null;
  }, [routeData?.routes, selectedRouteId]);

  const routeLine = useMemo(() => {
    const coordinates = selectedRoute?.geometry?.coordinates || [];
    return coordinates.map(([lng, lat]) => [lat, lng]);
  }, [selectedRoute?.geometry?.coordinates]);

  const mapCenter = useMemo(() => {
    if (routeLine.length > 0) {
      return routeLine[Math.floor(routeLine.length / 2)];
    }
    return [(fromPoint.lat + toPoint.lat) / 2, (fromPoint.lng + toPoint.lng) / 2];
  }, [fromPoint.lat, fromPoint.lng, routeLine, toPoint.lat, toPoint.lng]);

  const swapRouteCities = () => {
    setFromCity(toCity);
    setToCity(fromCity);
    setCustomFromPoint(null);
    setLocationNote("");
  };

  const applyPopularRoute = (source, destination) => {
    setFromCity(source);
    setToCity(destination);
    setCustomFromPoint(null);
    setLocationNote("");
  };

  const useCurrentLocation = async () => {
    setError("");
    setLocationNote("");
    setGeoLoading(true);

    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const canUseGeolocation = Boolean(navigator.geolocation);
    const secureEnough = window.isSecureContext || isLocalhost;

    try {
      if (canUseGeolocation && secureEnough) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 9000,
            maximumAge: 120000
          });
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nearestCity = getNearestRouteCity(lat, lng);
        if (nearestCity) {
          setFromCity(nearestCity.name);
        }
        setCustomFromPoint({ lat, lng });
        if (nearestCity && nearestCity.name === toCity) {
          const alternateCity = routeCities.find((city) => city.name !== nearestCity.name);
          if (alternateCity) setToCity(alternateCity.name);
        }
        setLocationNote(
          nearestCity
            ? `Using current location near ${nearestCity.name}.`
            : "Using current location."
        );
        return;
      }

      const approximateLocation = await fetchApproximateLocation();
      if (approximateLocation) {
        const nearestCity = getNearestRouteCity(approximateLocation.lat, approximateLocation.lng);
        if (nearestCity) {
          setFromCity(nearestCity.name);
          if (nearestCity.name === toCity) {
            const alternateCity = routeCities.find((city) => city.name !== nearestCity.name);
            if (alternateCity) setToCity(alternateCity.name);
          }
        }
        setCustomFromPoint({
          lat: approximateLocation.lat,
          lng: approximateLocation.lng
        });
        setLocationNote(
          nearestCity
            ? `GPS unavailable. Using approximate location near ${nearestCity.name}.`
            : "GPS unavailable. Using approximate location."
        );
        return;
      }

      setError("Unable to detect location automatically. Please choose source city manually.");
    } catch (locationError) {
      const approximateLocation = await fetchApproximateLocation();
      if (approximateLocation) {
        const nearestCity = getNearestRouteCity(approximateLocation.lat, approximateLocation.lng);
        if (nearestCity) {
          setFromCity(nearestCity.name);
          if (nearestCity.name === toCity) {
            const alternateCity = routeCities.find((city) => city.name !== nearestCity.name);
            if (alternateCity) setToCity(alternateCity.name);
          }
        }
        setCustomFromPoint({
          lat: approximateLocation.lat,
          lng: approximateLocation.lng
        });
        setLocationNote(
          nearestCity
            ? `GPS failed. Using approximate location near ${nearestCity.name}.`
            : "GPS failed. Using approximate location."
        );
        return;
      }

      setError(getLocationErrorMessage(locationError));
    } finally {
      setGeoLoading(false);
    }
  };

  const fetchRoute = async (event) => {
    event.preventDefault();

    if (fromCity === toCity) {
      setError("Please choose different source and destination.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/route-planner", {
        params: {
          fromLat: fromPoint.lat,
          fromLng: fromPoint.lng,
          toLat: toPoint.lat,
          toLng: toPoint.lng,
          profile: "bike"
        }
      });

      setRouteData(data.data);
      const firstId = data?.data?.routes?.[0]?.id || "";
      setSelectedRouteId(firstId);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to fetch route right now."));
      setRouteData(null);
      setSelectedRouteId("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      id="route-planner"
      className="glass-card route-planner"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="section-head">
        <h2>Smart Route Planner</h2>
        <p>Map-based routing with alternatives, bike fuel estimate, toll estimate, and turn guidance.</p>
      </div>

      <div className="route-chip-row">
        {popularRoutes.map(([source, destination]) => (
          <button
            key={`${source}-${destination}`}
            type="button"
            className="route-chip"
            onClick={() => applyPopularRoute(source, destination)}
          >
            {source} to {destination}
          </button>
        ))}
      </div>

      <form className="route-plan-form" onSubmit={fetchRoute}>
        <select
          value={fromCity}
          onChange={(event) => {
            setFromCity(event.target.value);
            setCustomFromPoint(null);
            setLocationNote("");
          }}
        >
          {routeCities.map((city) => (
            <option key={`from-${city.name}`} value={city.name}>
              From: {city.name}
            </option>
          ))}
        </select>
        <select value={toCity} onChange={(event) => setToCity(event.target.value)}>
          {routeCities.map((city) => (
            <option key={`to-${city.name}`} value={city.name}>
              To: {city.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn-outline" onClick={swapRouteCities}>
          Swap
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={useCurrentLocation}
          disabled={geoLoading}
        >
          {geoLoading ? "Locating..." : "Use My Location"}
        </button>
        <button type="submit" className="btn-primary" disabled={loading || fromCity === toCity}>
          {loading ? "Planning..." : "Plan Route"}
        </button>
      </form>

      {locationNote && <p className="location-note">{locationNote}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="route-map-grid">
        <div className="route-map-shell">
          <div className="map-toolbar">
            <span className="map-pill map-pill-from">{fromMarkerLabel}</span>
            <span className="map-toolbar-sep">to</span>
            <span className="map-pill map-pill-to">{toCity}</span>
            {selectedRoute && (
              <span className="map-pill map-pill-meta">
                {selectedRoute.distanceKm} km | {selectedRoute.durationMin} min
              </span>
            )}
          </div>

          <MapContainer
            key={`${fromCity}-${toCity}-${routeLine.length}`}
            center={mapCenter}
            zoom={6}
            className="route-map"
            scrollWheelZoom={true}
            whenReady={(event) => event.target.invalidateSize()}
          >
            <MapResizer watchKey={`${fromCity}-${toCity}-${routeLine.length}-${customFromPoint ? "1" : "0"}`} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <CircleMarker
              center={[fromPoint.lat, fromPoint.lng]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                weight: 2.5,
                fillColor: "#ff9933",
                fillOpacity: 0.95
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>{fromMarkerLabel}</Tooltip>
            </CircleMarker>

            <CircleMarker
              center={[toPoint.lat, toPoint.lng]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                weight: 2.5,
                fillColor: "#35b8ff",
                fillOpacity: 0.95
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>{toCity}</Tooltip>
            </CircleMarker>

            {routeLine.length > 1 && (
              <>
                <Polyline
                  positions={routeLine}
                  pathOptions={{ color: "#ff7e22", weight: 11, opacity: 0.22 }}
                />
                <Polyline
                  positions={routeLine}
                  pathOptions={{ color: "#ff9730", weight: 5, opacity: 0.98 }}
                />
                <Polyline
                  positions={routeLine}
                  pathOptions={{ color: "#fff1cb", weight: 2, opacity: 0.65, dashArray: "10 10" }}
                />
                <FitRouteBounds points={routeLine} />
              </>
            )}
          </MapContainer>

          <div className="map-legend">
            <span><i className="legend-dot from" />Start</span>
            <span><i className="legend-dot to" />Destination</span>
            <span><i className="legend-line" />Best route</span>
          </div>
        </div>

        <div className="route-metrics-card">
          <h3>{fromCity} to {toCity}</h3>
          {routeData?.provider && (
            <p className="route-provider">
              Route mode: {routeData.provider === "osrm_live" ? "Live routing" : "Smart estimate"}
            </p>
          )}
          {routeData?.notice && <p className="hint">{routeData.notice}</p>}

          {routeData ? (
            <>
              <div className="route-options">
                {(routeData.routes || []).map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    className={`route-option ${selectedRoute?.id === route.id ? "active" : ""}`}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    <span>{route.distanceKm} km</span>
                    <span>{route.durationMin} min</span>
                  </button>
                ))}
              </div>

              <div className="route-metrics">
                <p><strong>Distance:</strong> {selectedRoute?.distanceKm} km</p>
                <p><strong>ETA:</strong> {selectedRoute?.durationMin} min</p>
                <p><strong>Fuel estimate:</strong> {selectedRoute?.fuelEstimateLitres} L</p>
                <p><strong>Toll estimate:</strong> INR {selectedRoute?.tollEstimateInr}</p>
              </div>

              <div className="route-steps">
                <h4>Turn-by-turn Highlights</h4>
                <ol>
                  {(selectedRoute?.steps || []).slice(0, 8).map((step) => (
                    <li key={`${step.index}-${step.instruction}`}>
                      <span>{step.instruction}</span>
                      <small>
                        {step.distanceKm} km | {step.durationMin} min
                      </small>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <p className="hint">Choose source and destination, then click Plan Route.</p>
          )}
        </div>
      </div>
    </motion.section>
  );
}
