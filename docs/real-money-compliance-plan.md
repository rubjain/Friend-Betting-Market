# Agora Real-Money Compliance Plan

Agora should remain play-money only until these gates are complete and reviewed with qualified legal, payments, tax, and compliance counsel.

## Launch Gates

1. Define product classification by jurisdiction, including whether markets are regulated event contracts, gaming, sweepstakes, or another category.
2. Decide operating geography and block unsupported locations before account funding.
3. Implement identity, age, sanctions, fraud, payment, device, IP, and household checks before deposits or withdrawals.
4. Add responsible-use controls, including account limits, cooling-off periods, self-exclusion, support contacts, and clear risk disclosures.
5. Create funds-flow controls for deposits, bonus funds, settlement, reversals, chargebacks, refunds, tax reporting, and withdrawal review.
6. Build immutable audit logs for balance mutations, admin actions, market resolution, evidence, disputes, and compliance overrides.
7. Establish retention, privacy, and security policies for identity data, payment data, device fingerprints, and dispute evidence.
8. Complete incident-response, suspicious-activity review, and manual escalation procedures.

## Engineering Hooks Already Planned

- Separate withdrawable and bonus balances.
- Server-enforced ledger entries and settlement transactions.
- Verification placeholders for email, phone, identity, payment, and device checks.
- Risk-review queues that treat IP and household matches as signals instead of hard bans.
- Market evidence links, resolver notes, disputes, and audit trails.
- Admin-only controls guarded by role checks.

## Production Decision

The current product name can stay `Agora` for the MVP, but run trademark, domain, app-store, social-handle, and financial-services naming checks before public launch.
