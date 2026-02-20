function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCoordinate(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const deltaLat = toRad(toLat - fromLat);
  const deltaLng = toRad(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildFallbackGeometry(fromLat, fromLng, toLat, toLng) {
  const points = 20;
  const deltaLng = toLng - fromLng;
  const deltaLat = toLat - fromLat;
  const norm = Math.hypot(deltaLng, deltaLat) || 1;
  const perpLng = -deltaLat / norm;
  const perpLat = deltaLng / norm;
  const curveMagnitude = Math.hypot(deltaLng, deltaLat) * 0.05;

  const coordinates = Array.from({ length: points + 1 }, (_, index) => {
    const progress = index / points;
    const curve = Math.sin(progress * Math.PI) * curveMagnitude;
    const lng = fromLng + deltaLng * progress + perpLng * curve;
    const lat = fromLat + deltaLat * progress + perpLat * curve;
    return [Number(lng.toFixed(5)), Number(lat.toFixed(5))];
  });

  return {
    type: "LineString",
    coordinates
  };
}

function buildFallbackSteps(distanceKm, durationMin) {
  const firstLegDistance = Number((distanceKm * 0.18).toFixed(1));
  const midLegDistance = Number((distanceKm * 0.64).toFixed(1));
  const finalLegDistance = Number((distanceKm - firstLegDistance - midLegDistance).toFixed(1));

  const firstLegDuration = Math.max(6, Math.round(durationMin * 0.16));
  const midLegDuration = Math.max(12, Math.round(durationMin * 0.66));
  const finalLegDuration = Math.max(6, durationMin - firstLegDuration - midLegDuration);

  return [
    {
      index: 1,
      instruction: "Start from your pickup point and merge onto the primary city road.",
      distanceKm: firstLegDistance,
      durationMin: firstLegDuration
    },
    {
      index: 2,
      instruction: "Continue on the main highway corridor toward your destination region.",
      distanceKm: midLegDistance,
      durationMin: midLegDuration
    },
    {
      index: 3,
      instruction: "Exit toward local roads and follow signs for your destination area.",
      distanceKm: finalLegDistance,
      durationMin: finalLegDuration
    },
    {
      index: 4,
      instruction: "Arrive at destination.",
      distanceKm: 0,
      durationMin: 1
    }
  ];
}

function buildFallbackRoute(fromLat, fromLng, toLat, toLng) {
  const straightDistanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const distanceKm = Number((straightDistanceKm * 1.18).toFixed(1));
  const durationMin = Math.max(20, Math.round((distanceKm / 52) * 60));
  const fuelEstimateLitres = Number((distanceKm / 32).toFixed(1));
  const tollEstimateInr = Math.max(0, Math.round(distanceKm * 1.2));

  return {
    id: "route_1",
    distanceKm,
    durationMin,
    fuelEstimateLitres,
    tollEstimateInr,
    geometry: buildFallbackGeometry(fromLat, fromLng, toLat, toLng),
    legs: [],
    steps: buildFallbackSteps(distanceKm, durationMin)
  };
}

function safeRoundedDistance(distanceMeters) {
  return Number(((distanceMeters || 0) / 1000).toFixed(2));
}

function safeRoundedDuration(durationSeconds) {
  return Math.max(1, Math.round((durationSeconds || 0) / 60));
}

function toDirectionStep(step, index) {
  const maneuver = step?.maneuver || {};
  const distanceKm = safeRoundedDistance(step?.distance);
  const durationMin = safeRoundedDuration(step?.duration);
  const maneuverType = (maneuver?.type || "continue").replace(/_/g, " ");
  const modifier = maneuver?.modifier ? ` ${maneuver.modifier}` : "";
  const roadName = step?.name ? ` on ${step.name}` : "";

  return {
    index: index + 1,
    instruction: `${maneuverType}${modifier}${roadName}`.trim(),
    distanceKm,
    durationMin
  };
}

function toRouteMetrics(route, id) {
  const distanceKm = Number((route.distance / 1000).toFixed(1));
  const durationMin = safeRoundedDuration(route.duration);
  const fuelEstimateLitres = Number((distanceKm / 32).toFixed(1));
  const tollEstimateInr = Math.max(0, Math.round(distanceKm * 1.4));

  const steps = (route.legs || [])
    .flatMap((leg) => leg.steps || [])
    .slice(0, 12)
    .map((step, index) => toDirectionStep(step, index));

  return {
    id,
    distanceKm,
    durationMin,
    fuelEstimateLitres,
    tollEstimateInr,
    geometry: route.geometry,
    legs: route.legs || [],
    steps
  };
}

async function fetchOsrmPayload(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function planRoute(req, res, next) {
  try {
    const fromLat = toNumber(req.query.fromLat);
    const fromLng = toNumber(req.query.fromLng);
    const toLat = toNumber(req.query.toLat);
    const toLng = toNumber(req.query.toLng);
    const profile = req.query.profile === "bike" ? "driving" : "driving";

    if (
      fromLat === null ||
      fromLng === null ||
      toLat === null ||
      toLng === null ||
      !isValidCoordinate(fromLat, fromLng) ||
      !isValidCoordinate(toLat, toLng)
    ) {
      return res.status(400).json({ message: "Invalid route coordinates." });
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=true&annotations=duration,distance`;

    const payload = await fetchOsrmPayload(osrmUrl);
    const hasLiveRoutes = Array.isArray(payload?.routes) && payload.routes.length > 0;

    let routeCandidates = [];
    let provider = "osrm_live";
    let notice = "";

    if (hasLiveRoutes) {
      routeCandidates = payload.routes
        .slice(0, 3)
        .map((route, index) => toRouteMetrics(route, `route_${index + 1}`));
    } else {
      routeCandidates = [buildFallbackRoute(fromLat, fromLng, toLat, toLng)];
      provider = "smart_estimate";
      notice =
        "Live route service is currently busy, so a smart estimated route is shown.";
    }

    const primaryRoute = routeCandidates[0];

    return res.json({
      data: {
        distanceKm: primaryRoute.distanceKm,
        durationMin: primaryRoute.durationMin,
        fuelEstimateLitres: primaryRoute.fuelEstimateLitres,
        tollEstimateInr: primaryRoute.tollEstimateInr,
        geometry: primaryRoute.geometry,
        legs: primaryRoute.legs,
        steps: primaryRoute.steps,
        provider,
        notice,
        routes: routeCandidates
      }
    });
  } catch (error) {
    return next(error);
  }
}
