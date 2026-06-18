"use client";

import { useEffect, useState } from "react";
import { useAgora } from "../context/AgoraContext";
import { InfoRow } from "./ui";

function statusText(value) {
  return String(value || "not started")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isVerified(status) {
  return String(status || "").toLowerCase() === "verified";
}

function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(error.message || "Location permission was denied."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function ComplianceVerificationPanel() {
  const { state, actions } = useAgora();
  const settings = state.currentUser.settings;
  const [states, setStates] = useState([]);
  const [pending, setPending] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [identityMessage, setIdentityMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [geoPreview, setGeoPreview] = useState(null);

  const [identityForm, setIdentityForm] = useState({
    legalFirstName: "",
    legalLastName: "",
    dateOfBirth: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    attestationAccepted: false,
  });

  const [locationState, setLocationState] = useState("");

  useEffect(() => {
    fetch("/api/compliance/states")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.states) setStates(payload.states);
      })
      .catch(() => {});
  }, []);

  const identityDone = isVerified(settings.identityVerificationStatus);
  const locationDone = isVerified(settings.locationVerificationStatus);
  const ageDone = isVerified(settings.ageVerificationStatus);
  const sanctionsDone = isVerified(settings.sanctionsVerificationStatus);

  async function captureLocation() {
    setLocationError("");
    setLocationMessage("");
    setPending("geo");
    try {
      const coords = await requestBrowserLocation();
      setGeoPreview(coords);
      setLocationMessage("Location captured. Submit to confirm your state.");
    } catch (error) {
      setLocationError(error.message || "Could not read your location.");
    } finally {
      setPending("");
    }
  }

  async function submitIdentity(event) {
    event.preventDefault();
    if (pending || identityDone) return;
    setPending("identity");
    setIdentityError("");
    setIdentityMessage("");
    try {
      const result = await actions.submitIdentityVerification(identityForm);
      if (!result.ok) {
        setIdentityError(result.message || "Identity verification failed.");
        return;
      }
      setIdentityMessage(result.message || "Identity verified.");
    } catch {
      setIdentityError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
  }

  async function submitLocation(event) {
    event.preventDefault();
    if (pending || locationDone) return;
    if (!geoPreview) {
      setLocationError("Capture your location before submitting.");
      return;
    }
    setPending("location");
    setLocationError("");
    setLocationMessage("");
    try {
      const result = await actions.submitLocationVerification({
        declaredState: locationState,
        ...geoPreview,
      });
      if (!result.ok) {
        setLocationError(result.message || "Location verification failed.");
        return;
      }
      setLocationMessage(result.message || "Location verified.");
      setGeoPreview(null);
    } catch {
      setLocationError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
  }

  const selectedIdentityState = states.find((item) => item.code === identityForm.state);
  const selectedLocationState = states.find((item) => item.code === locationState);

  return (
    <div className="compliance-verification-panel">
      <p className="settings-section-body">
        U.S. law requires identity and location checks before real-money deposits, withdrawals, and trading.
        During the paper beta you can complete these steps now; they will carry over when real money launches.
      </p>

      <div className="balance-mini-grid">
        <InfoRow label="Email" value={statusText(settings.emailVerificationStatus)} />
        <InfoRow label="Identity" value={statusText(settings.identityVerificationStatus)} />
        <InfoRow label="Location" value={statusText(settings.locationVerificationStatus)} />
        <InfoRow label="Age" value={statusText(settings.ageVerificationStatus)} />
        <InfoRow label="Sanctions" value={statusText(settings.sanctionsVerificationStatus)} />
      </div>

      {!state.auth.authenticated ? (
        <p className="settings-section-body">Sign in to complete identity and location verification.</p>
      ) : null}

      {state.auth.authenticated && !identityDone ? (
        <form className="settings-inline-form compliance-form" onSubmit={submitIdentity}>
          <h4>Identity verification</h4>
          <p className="settings-section-body">
            Provide your legal name, date of birth, and address. We verify your age against state law and run a
            sanctions screen. A certified KYC vendor will replace this beta flow before real-money launch.
          </p>
          <div className="compliance-form-grid">
            <label className="field">
              <span className="label">Legal first name</span>
              <input
                value={identityForm.legalFirstName}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, legalFirstName: event.target.value }))}
                autoComplete="given-name"
              />
            </label>
            <label className="field">
              <span className="label">Legal last name</span>
              <input
                value={identityForm.legalLastName}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, legalLastName: event.target.value }))}
                autoComplete="family-name"
              />
            </label>
            <label className="field">
              <span className="label">Date of birth</span>
              <input
                type="date"
                value={identityForm.dateOfBirth}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              />
            </label>
            <label className="field">
              <span className="label">Street address</span>
              <input
                value={identityForm.addressLine1}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                autoComplete="street-address"
              />
            </label>
            <label className="field">
              <span className="label">City</span>
              <input
                value={identityForm.city}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, city: event.target.value }))}
                autoComplete="address-level2"
              />
            </label>
            <label className="field">
              <span className="label">State</span>
              <select
                value={identityForm.state}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, state: event.target.value }))}
              >
                <option value="">Select state</option>
                {states.map((item) => (
                  <option key={item.code} value={item.code} disabled={!item.allowed}>
                    {item.label}
                    {!item.allowed ? " (not available)" : ` (min age ${item.minAge})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">ZIP code</span>
              <input
                value={identityForm.zip}
                onChange={(event) => setIdentityForm((prev) => ({ ...prev, zip: event.target.value }))}
                autoComplete="postal-code"
              />
            </label>
          </div>
          {selectedIdentityState && !selectedIdentityState.allowed ? (
            <p className="auth-error">{selectedIdentityState.reason}</p>
          ) : null}
          <label className="compliance-attestation">
            <input
              type="checkbox"
              checked={identityForm.attestationAccepted}
              onChange={(event) =>
                setIdentityForm((prev) => ({ ...prev, attestationAccepted: event.target.checked }))
              }
            />
            <span>
              I confirm the information above is accurate, I am not on any sanctions list, and I meet the minimum
              age requirement for my state.
            </span>
          </label>
          {identityMessage ? <p className="auth-success">{identityMessage}</p> : null}
          {identityError ? <p className="auth-error">{identityError}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={!!pending}>
            {pending === "identity" ? "Verifying..." : "Submit identity verification"}
          </button>
        </form>
      ) : null}

      {state.auth.authenticated && identityDone ? (
        <p className="auth-success">Identity verification complete{ageDone ? " — age confirmed" : ""}{sanctionsDone ? ", sanctions cleared" : ""}.</p>
      ) : null}

      {state.auth.authenticated && !locationDone ? (
        <form className="settings-inline-form compliance-form" onSubmit={submitLocation}>
          <h4>Location verification</h4>
          <p className="settings-section-body">
            Select your current state and allow browser location access. Your GPS coordinates must match the
            selected state and fall within a jurisdiction where Agora is permitted.
          </p>
          <label className="field">
            <span className="label">Current state</span>
            <select value={locationState} onChange={(event) => setLocationState(event.target.value)}>
              <option value="">Select state</option>
              {states.filter((item) => item.allowed).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} (min age {item.minAge})
                </option>
              ))}
            </select>
          </label>
          {selectedLocationState && !selectedLocationState.allowed ? (
            <p className="auth-error">{selectedLocationState.reason}</p>
          ) : null}
          <div className="settings-inline-actions">
            <button className="btn btn-secondary" type="button" disabled={!!pending} onClick={captureLocation}>
              {pending === "geo" ? "Reading location..." : geoPreview ? "Refresh location" : "Allow location access"}
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!!pending || !locationState || !geoPreview}
            >
              {pending === "location" ? "Confirming..." : "Confirm location"}
            </button>
          </div>
          {geoPreview ? (
            <p className="settings-section-body">
              Location captured with ~{Math.round(geoPreview.accuracy || 0)}m accuracy.
            </p>
          ) : null}
          {locationMessage ? <p className="auth-success">{locationMessage}</p> : null}
          {locationError ? <p className="auth-error">{locationError}</p> : null}
        </form>
      ) : null}

      {state.auth.authenticated && locationDone ? (
        <p className="auth-success">Location verification complete.</p>
      ) : null}
    </div>
  );
}
