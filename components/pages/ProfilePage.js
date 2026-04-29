"use client";

import { useEffect, useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money, titleCase } from "../../lib/formatters";
import { InfoRow, SectionHead } from "../ui";

export default function ProfilePage() {
  const { state, actions } = useFriendMarket();
  const [profileDraft, setProfileDraft] = useState({
    name: state.currentUser.name,
    email: state.currentUser.email,
  });
  const [loginIdentifier, setLoginIdentifier] = useState(state.currentUser.email);
  const [signupDraft, setSignupDraft] = useState({
    name: "",
    email: "",
    username: "",
  });

  useEffect(() => {
    setProfileDraft({
      name: state.currentUser.name,
      email: state.currentUser.email,
    });
  }, [state.currentUser.email, state.currentUser.name]);

  async function saveProfile(event) {
    event.preventDefault();
    await actions.updateProfile(profileDraft);
  }

  async function login(event) {
    event.preventDefault();
    await actions.login(loginIdentifier);
  }

  async function signup(event) {
    event.preventDefault();
    await actions.signup(signupDraft);
  }

  return (
    <section className="page active">
      <SectionHead
        title="Profile"
        body="Basic account details with enough structure to support future verification and risk tooling."
      />
      <div className="profile-grid">
        <div className="list-card">
          <h3>Session</h3>
          <div className="info-list profile-meta">
            <InfoRow label="Status" value={state.auth.authenticated ? "Signed in" : "Demo guest"} />
            <InfoRow label="Signed in as" value={state.currentUser.email} />
          </div>
          {state.auth.authenticated ? (
            <div className="inline-actions profile-actions">
              <button className="btn btn-secondary" type="button" onClick={actions.logout}>
                Log Out
              </button>
            </div>
          ) : (
            <form className="form-grid" onSubmit={login}>
              <div className="field">
                <label className="label" htmlFor="login-identifier">
                  Email or username
                </label>
                <input
                  id="login-identifier"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.currentTarget.value)}
                />
              </div>
              <div className="field full">
                <button className="btn btn-primary" type="submit">
                  Log In
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="list-card">
          <h3>Create account</h3>
          <form className="form-grid" onSubmit={signup}>
            <div className="field">
              <label className="label" htmlFor="signup-name">
                Name
              </label>
              <input
                id="signup-name"
                value={signupDraft.name}
                onChange={(event) =>
                  setSignupDraft((draft) => ({ ...draft, name: event.currentTarget.value }))
                }
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupDraft.email}
                onChange={(event) =>
                  setSignupDraft((draft) => ({ ...draft, email: event.currentTarget.value }))
                }
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="signup-username">
                Username
              </label>
              <input
                id="signup-username"
                value={signupDraft.username}
                placeholder="@username"
                onChange={(event) =>
                  setSignupDraft((draft) => ({ ...draft, username: event.currentTarget.value }))
                }
              />
            </div>
            <div className="field full">
              <button className="btn btn-secondary" type="submit">
                Sign Up
              </button>
            </div>
          </form>
        </div>
        <div className="list-card">
          <h3>Account</h3>
          <form className="form-grid" onSubmit={saveProfile}>
            <div className="field">
              <label className="label" htmlFor="profile-name">
                Name
              </label>
              <input
                id="profile-name"
                value={profileDraft.name}
                onChange={(event) =>
                  setProfileDraft((draft) => ({ ...draft, name: event.currentTarget.value }))
                }
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profileDraft.email}
                onChange={(event) =>
                  setProfileDraft((draft) => ({ ...draft, email: event.currentTarget.value }))
                }
              />
            </div>
            <div className="field full">
              <button className="btn btn-primary" type="submit">
                Save Profile
              </button>
            </div>
          </form>
          <div className="info-list profile-meta">
            <InfoRow label="Username" value={state.currentUser.username} />
            <InfoRow label="Role" value={state.currentUser.isAdmin ? "Admin" : "Member"} />
          </div>
        </div>
        <div className="list-card">
          <h3>Balances</h3>
          <div className="info-list">
            <InfoRow label="Withdrawable" value={money(state.currentUser.withdrawable_balance)} />
            <InfoRow label="Bonus" value={money(state.currentUser.bonus_balance)} />
            <InfoRow label="Play credit total" value={money(state.currentUser.play_credit_balance)} />
          </div>
        </div>
        <div className="list-card">
          <h3>Settings</h3>
          <div className="settings-grid">
            <InfoRow label="Bonus usage" value={titleCase(state.currentUser.settings.betBonusUsage)} />
            <InfoRow
              label="Bonus market eligibility"
              value={titleCase(state.currentUser.settings.bonusMarketEligibility)}
            />
            <InfoRow
              label="Email verification"
              value={titleCase(state.currentUser.settings.emailVerificationStatus ?? "pending")}
            />
            <InfoRow
              label="Phone verification"
              value={titleCase(state.currentUser.settings.phoneVerificationStatus)}
            />
            <InfoRow
              label="Identity verification"
              value={titleCase(state.currentUser.settings.identityVerificationStatus ?? "placeholder")}
            />
            <InfoRow
              label="Payment verification"
              value={titleCase(state.currentUser.settings.paymentVerificationStatus ?? "placeholder")}
            />
            <InfoRow label="Risk status" value={titleCase(state.currentUser.settings.riskStatus)} />
          </div>
          <div className="inline-actions profile-actions">
            <button className="btn btn-secondary" type="button" onClick={() => actions.updateVerification("email")}>
              Verify Email
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => actions.updateVerification("phone")}>
              Verify Phone
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => actions.updateVerification("identity")}>
              Identity Placeholder
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => actions.updateVerification("payment")}>
              Payment Placeholder
            </button>
          </div>
        </div>
        <div className="list-card">
          <h3>Future anti-abuse placeholders</h3>
          <div className="info-list">
            <InfoRow label="Identity signals" value="Phone, email, government ID" />
            <InfoRow label="Payment signals" value="Card, bank, payment-method uniqueness" />
            <InfoRow label="Behavioral signals" value="Device, IP, household, friend-graph risk scoring" />
            <InfoRow label="Manual controls" value="Freeze account, claw back bonus, review queue" />
          </div>
        </div>
      </div>
    </section>
  );
}
