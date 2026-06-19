import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAge,
  coordinatesMatchState,
  getMinimumAge,
  isStateAllowed,
  resolveStateFromCoordinates,
  screenSanctions,
  validateAgeForState,
  validateIdentitySubmission,
  validateLocationSubmission,
} from "../lib/stateCompliance.js";

test("blocked states are not allowed", () => {
  assert.equal(isStateAllowed("NV"), false);
  assert.equal(isStateAllowed("WA"), false);
  assert.equal(isStateAllowed("NY"), true);
});

test("minimum age follows jurisdiction rules", () => {
  assert.equal(getMinimumAge("NY"), 18);
  assert.equal(getMinimumAge("NJ"), 21);
});

test("age validation enforces state minimums", () => {
  const young = validateAgeForState("2010-01-01", "NJ", new Date("2026-06-07T12:00:00Z"));
  assert.equal(young.ok, false);

  const oldEnough = validateAgeForState("2000-01-01", "NJ", new Date("2026-06-07T12:00:00Z"));
  assert.equal(oldEnough.ok, true);
  assert.equal(oldEnough.age >= 21, true);
});

test("calculateAge handles birthdays that have not occurred yet this year", () => {
  const age = calculateAge("2000-12-31", new Date("2026-06-07T12:00:00Z"));
  assert.equal(age, 25);
});

test("coordinates resolve within state bounds", () => {
  assert.equal(coordinatesMatchState(40.7128, -74.006, "NY"), true);
  assert.equal(coordinatesMatchState(40.7128, -74.006, "CA"), false);
  assert.equal(resolveStateFromCoordinates(42.6526, -73.7562), "NY");
});

test("location verification requires geolocation in a permitted state", () => {
  const blocked = validateLocationSubmission({
    declaredState: "NV",
    latitude: 36.1699,
    longitude: -115.1398,
  });
  assert.equal(blocked.ok, false);

  const mismatch = validateLocationSubmission({
    declaredState: "NY",
    latitude: 34.0522,
    longitude: -118.2437,
  });
  assert.equal(mismatch.ok, false);

  const ok = validateLocationSubmission({
    declaredState: "NY",
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 25,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.stateCode, "NY");
});

test("identity verification validates required fields and sanctions", () => {
  const incomplete = validateIdentitySubmission({
    legalFirstName: "A",
    legalLastName: "User",
    dateOfBirth: "2000-01-01",
    addressLine1: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    attestationAccepted: false,
  });
  assert.equal(incomplete.ok, false);

  const blocked = validateIdentitySubmission({
    legalFirstName: "Blocked",
    legalLastName: "Sanctions Test",
    dateOfBirth: "1990-01-01",
    addressLine1: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    attestationAccepted: true,
  });
  assert.equal(blocked.ok, false);

  const ok = validateIdentitySubmission({
    legalFirstName: "Alex",
    legalLastName: "Rivera",
    dateOfBirth: "1990-01-01",
    addressLine1: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    attestationAccepted: true,
  });
  assert.equal(ok.ok, true);
  assert.equal(screenSanctions("Alex Rivera").ok, true);
});
