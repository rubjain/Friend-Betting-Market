/**
 * Jurisdiction rules for prediction-market / event-contract style products.
 * Conservative allowlist — update with counsel before real-money launch.
 * minAge reflects common state thresholds (21 where sports wagering is regulated, 18 elsewhere).
 */

export const US_JURISDICTIONS = {
  AL: { allowed: true, minAge: 21, label: "Alabama" },
  AK: { allowed: true, minAge: 21, label: "Alaska" },
  AZ: { allowed: true, minAge: 21, label: "Arizona" },
  AR: { allowed: true, minAge: 21, label: "Arkansas" },
  CA: { allowed: true, minAge: 18, label: "California" },
  CO: { allowed: true, minAge: 21, label: "Colorado" },
  CT: { allowed: true, minAge: 21, label: "Connecticut" },
  DE: { allowed: true, minAge: 21, label: "Delaware" },
  DC: { allowed: true, minAge: 21, label: "District of Columbia" },
  FL: { allowed: true, minAge: 21, label: "Florida" },
  GA: { allowed: true, minAge: 18, label: "Georgia" },
  HI: {
    allowed: false,
    minAge: 21,
    label: "Hawaii",
    reason: "Hawaii law prohibits online wagering and prediction-market-style products.",
  },
  ID: {
    allowed: false,
    minAge: 18,
    label: "Idaho",
    reason: "Idaho restricts online prediction and wagering products.",
  },
  IL: { allowed: true, minAge: 21, label: "Illinois" },
  IN: { allowed: true, minAge: 21, label: "Indiana" },
  IA: { allowed: true, minAge: 21, label: "Iowa" },
  KS: { allowed: true, minAge: 21, label: "Kansas" },
  KY: { allowed: true, minAge: 18, label: "Kentucky" },
  LA: { allowed: true, minAge: 21, label: "Louisiana" },
  ME: { allowed: true, minAge: 18, label: "Maine" },
  MD: { allowed: true, minAge: 21, label: "Maryland" },
  MA: { allowed: true, minAge: 21, label: "Massachusetts" },
  MI: { allowed: true, minAge: 21, label: "Michigan" },
  MN: { allowed: true, minAge: 18, label: "Minnesota" },
  MS: { allowed: true, minAge: 21, label: "Mississippi" },
  MO: { allowed: true, minAge: 21, label: "Missouri" },
  MT: { allowed: true, minAge: 18, label: "Montana" },
  NE: { allowed: true, minAge: 21, label: "Nebraska" },
  NV: {
    allowed: false,
    minAge: 21,
    label: "Nevada",
    reason: "Nevada requires in-state gaming licenses for this activity.",
  },
  NH: { allowed: true, minAge: 18, label: "New Hampshire" },
  NJ: { allowed: true, minAge: 21, label: "New Jersey" },
  NM: { allowed: true, minAge: 21, label: "New Mexico" },
  NY: { allowed: true, minAge: 18, label: "New York" },
  NC: { allowed: true, minAge: 21, label: "North Carolina" },
  ND: { allowed: true, minAge: 18, label: "North Dakota" },
  OH: { allowed: true, minAge: 21, label: "Ohio" },
  OK: { allowed: true, minAge: 18, label: "Oklahoma" },
  OR: { allowed: true, minAge: 21, label: "Oregon" },
  PA: { allowed: true, minAge: 21, label: "Pennsylvania" },
  RI: { allowed: true, minAge: 21, label: "Rhode Island" },
  SC: { allowed: true, minAge: 18, label: "South Carolina" },
  SD: { allowed: true, minAge: 18, label: "South Dakota" },
  TN: { allowed: true, minAge: 21, label: "Tennessee" },
  TX: { allowed: true, minAge: 18, label: "Texas" },
  UT: {
    allowed: false,
    minAge: 18,
    label: "Utah",
    reason: "Utah law prohibits most forms of online wagering and prediction markets.",
  },
  VT: { allowed: true, minAge: 18, label: "Vermont" },
  VA: { allowed: true, minAge: 21, label: "Virginia" },
  WA: {
    allowed: false,
    minAge: 18,
    label: "Washington",
    reason: "Washington restricts online prediction-market and wagering products.",
  },
  WV: { allowed: true, minAge: 21, label: "West Virginia" },
  WI: { allowed: true, minAge: 18, label: "Wisconsin" },
  WY: { allowed: true, minAge: 18, label: "Wyoming" },
};

/** Approximate bounding boxes for geolocation cross-check (decimal degrees). */
export const STATE_BOUNDS = {
  AL: { minLat: 30.1, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  AK: { minLat: 51.0, maxLat: 71.5, minLng: -179.0, maxLng: -129.0 },
  AZ: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  AR: { minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
  CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.5, maxLng: -114.1 },
  CO: { minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  CT: { minLat: 40.9, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
  DE: { minLat: 38.4, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
  DC: { minLat: 38.79, maxLat: 39.0, minLng: -77.12, maxLng: -76.91 },
  FL: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
  GA: { minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  IL: { minLat: 37.0, maxLat: 42.5, minLng: -91.5, maxLng: -87.5 },
  IN: { minLat: 37.8, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
  IA: { minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
  KS: { minLat: 37.0, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
  KY: { minLat: 36.5, maxLat: 39.2, minLng: -89.6, maxLng: -81.9 },
  LA: { minLat: 29.0, maxLat: 33.0, minLng: -94.0, maxLng: -89.0 },
  ME: { minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
  MD: { minLat: 37.9, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
  MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
  MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.4, maxLng: -82.4 },
  MN: { minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
  MS: { minLat: 30.2, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
  MO: { minLat: 36.0, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
  MT: { minLat: 44.4, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
  NE: { minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
  NH: { minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.6 },
  NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  NM: { minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
  NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
  NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
  ND: { minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.6 },
  OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.8, maxLng: -80.5 },
  OK: { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
  OR: { minLat: 42.0, maxLat: 46.3, minLng: -124.6, maxLng: -116.5 },
  PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
  RI: { minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
  SC: { minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  SD: { minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
  TN: { minLat: 35.0, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.7, maxLng: -93.5 },
  VT: { minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
  VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  WV: { minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
  WI: { minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.8 },
  WY: { minLat: 41.0, maxLat: 45.0, minLng: -111.1, maxLng: -104.0 },
};

const DEMO_SANCTIONS_BLOCKLIST = [
  "osama bin laden",
  "saddam hussein",
  "blocked sanctions test",
];

export function normalizeStateCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

export function getStateRule(stateCode) {
  const code = normalizeStateCode(stateCode);
  return US_JURISDICTIONS[code] ?? null;
}

export function isStateAllowed(stateCode) {
  const rule = getStateRule(stateCode);
  return Boolean(rule?.allowed);
}

export function getMinimumAge(stateCode) {
  const rule = getStateRule(stateCode);
  return rule?.minAge ?? 21;
}

export function listAllowedStates() {
  return Object.entries(US_JURISDICTIONS)
    .filter(([, rule]) => rule.allowed)
    .map(([code, rule]) => ({ code, label: rule.label, minAge: rule.minAge }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function listAllStates() {
  return Object.entries(US_JURISDICTIONS)
    .map(([code, rule]) => ({
      code,
      label: rule.label,
      allowed: rule.allowed,
      minAge: rule.minAge,
      reason: rule.reason ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function coordinatesMatchState(latitude, longitude, stateCode) {
  const code = normalizeStateCode(stateCode);
  const bounds = STATE_BOUNDS[code];
  if (!bounds) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

function boundsCenter(bounds) {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

function coordinateDistance(lat, lng, center) {
  const dLat = lat - center.lat;
  const dLng = lng - center.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function resolveStateFromCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const matches = [];
  for (const [code, bounds] of Object.entries(STATE_BOUNDS)) {
    if (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
    ) {
      const center = boundsCenter(bounds);
      matches.push({ code, distance: coordinateDistance(lat, lng, center) });
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => a.distance - b.distance);
  return matches[0].code;
}

export function calculateAge(dateOfBirth, now = new Date()) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function validateAgeForState(dateOfBirth, stateCode, now = new Date()) {
  const age = calculateAge(dateOfBirth, now);
  if (age == null) {
    return { ok: false, message: "Enter a valid date of birth." };
  }
  const minAge = getMinimumAge(stateCode);
  if (age < minAge) {
    return {
      ok: false,
      message: `You must be at least ${minAge} in ${getStateRule(stateCode)?.label || stateCode} to use Agora.`,
      age,
      minAge,
    };
  }
  if (age > 120) {
    return { ok: false, message: "Enter a valid date of birth." };
  }
  return { ok: true, age, minAge };
}

export function screenSanctions(fullName) {
  const normalized = String(fullName || "").trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Enter your legal name for sanctions screening." };
  }
  const blocked = DEMO_SANCTIONS_BLOCKLIST.some((entry) => normalized.includes(entry));
  if (blocked) {
    return {
      ok: false,
      message: "Identity could not be verified. Contact support if you believe this is an error.",
    };
  }
  return { ok: true };
}

export function validateLocationSubmission({
  declaredState,
  latitude,
  longitude,
  accuracy,
}) {
  const stateCode = normalizeStateCode(declaredState);
  const rule = getStateRule(stateCode);

  if (!rule) {
    return { ok: false, message: "Select a valid U.S. state or district." };
  }
  if (!rule.allowed) {
    return {
      ok: false,
      message: rule.reason || "Agora is not available in your selected state.",
      stateCode,
    };
  }

  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  if (!hasCoordinates) {
    return {
      ok: false,
      message: "Allow location access so we can confirm you are in a permitted state.",
      stateCode,
    };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!coordinatesMatchState(lat, lng, stateCode)) {
    const resolvedState = resolveStateFromCoordinates(lat, lng);
    if (resolvedState && resolvedState !== stateCode) {
      return {
        ok: false,
        message: `Your device location appears to be ${US_JURISDICTIONS[resolvedState]?.label || resolvedState}, not ${rule.label}.`,
        stateCode,
        resolvedState,
      };
    }
    return {
      ok: false,
      message: "Location coordinates do not match the selected state.",
      stateCode,
    };
  }

  const accuracyMeters = Number(accuracy);
  if (Number.isFinite(accuracyMeters) && accuracyMeters > 50000) {
    return {
      ok: false,
      message: "Location signal is too imprecise. Try again with a stronger GPS or Wi-Fi signal.",
      stateCode,
    };
  }

  return {
    ok: true,
    stateCode,
    method: "geolocation",
    geolocated: true,
    accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : null,
  };
}

export function validateIdentitySubmission({
  legalFirstName,
  legalLastName,
  dateOfBirth,
  addressLine1,
  city,
  state,
  zip,
  attestationAccepted,
}) {
  const firstName = String(legalFirstName || "").trim();
  const lastName = String(legalLastName || "").trim();
  const address = String(addressLine1 || "").trim();
  const cityName = String(city || "").trim();
  const stateCode = normalizeStateCode(state);
  const zipCode = String(zip || "").trim();

  if (firstName.length < 2 || lastName.length < 2) {
    return { ok: false, message: "Enter your legal first and last name." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth || ""))) {
    return { ok: false, message: "Enter your date of birth as YYYY-MM-DD." };
  }
  if (address.length < 5) {
    return { ok: false, message: "Enter your street address." };
  }
  if (cityName.length < 2) {
    return { ok: false, message: "Enter your city." };
  }
  if (!getStateRule(stateCode)) {
    return { ok: false, message: "Select a valid U.S. state." };
  }
  if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
    return { ok: false, message: "Enter a valid ZIP code." };
  }
  if (!attestationAccepted) {
    return {
      ok: false,
      message: "Confirm the legal attestation before submitting identity verification.",
    };
  }

  const rule = getStateRule(stateCode);
  if (!rule.allowed) {
    return {
      ok: false,
      message: rule.reason || "Identity verification is not available in your state.",
    };
  }

  const ageCheck = validateAgeForState(dateOfBirth, stateCode);
  if (!ageCheck.ok) {
    return ageCheck;
  }

  const fullName = `${firstName} ${lastName}`;
  const sanctionsCheck = screenSanctions(fullName);
  if (!sanctionsCheck.ok) {
    return sanctionsCheck;
  }

  return {
    ok: true,
    stateCode,
    fullName,
    age: ageCheck.age,
    minAge: ageCheck.minAge,
    initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(),
    zipCode,
    cityName,
  };
}
