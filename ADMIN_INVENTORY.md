# Admin inventory

Updated 2026-11-01. This repo has no admin website. The admin side is API routes behind an admin login. Swagger is at `/api-docs`.

## In place

- Admin login gate, plus a script to create the first admin. A signed-in admin can create another admin and change a person's role.
- User management: list, view (seats, pending requests, phone, country, timezone, age, where they heard about BuddyPass, metadata, and whether the profile is complete), edit name and avatar, change role, verify, activate or deactivate, and delete. An admin cannot suspend their own account. The customer sets phone and country on their own profile.
- Dashboard: user, subscription, and provider counts; seat inventory per service (total, taken, free); waiting count; accounts whose provider date is inside the next week; newest open capacity alerts.
- Waiting line is read-only for the admin. Place numbers match what the customer sees on their own requests. The customer can cancel a pending request. A free seat is assigned immediately. A full pool fills first-in, first-out. There is no accept, reject, or manual assign.
- Capacity alerts open when the last allocatable account in a provider-and-country pool takes its first seat, or when people waiting already outnumber free seats. The alert names who is waiting. `POST /api/admin/capacity-alerts/:alertId/accounts` creates the next login for that pool. Signup at the streaming service stays manual.
- Providers, countries, and currencies. A provider can have an icon. A shared account stores wholesale cost, seat price, seat count, provider expiry, and encrypted credentials.
- Password replacement overwrites the stored secret. The next reveal is the new password. Each reveal is stored.
- Two clocks. The provider date does not evict seated people and is warned to admins only. The customer month starts when payment is confirmed. An unpaid new seat is held for 24 hours. A finished unpaid month is blocked for 3 days, then freed. A payment waiting for an admin keeps that seat until the admin confirms or rejects it. Renewal keeps the same seat.
- Public offers at `GET /api/offers`: icon, description, price, currency, and free seats. No streaming email and no wholesale cost.
- Login codes. The mailbox (`IMAP_USER`) must receive mail sent to every streaming login email. Plus addressing (`you+netflix1@gmail.com`) or a catch-all domain both work, and the login email stored on the account must be that exact address. BuddyPass does not create those addresses. `INBOX_DOMAIN` only matters for a per-seat alias. Each provider stores the sender domains that may send a code, and an optional pattern. Polling runs when IMAP is configured. A paid customer taps Get verification code. One person per account is active at a time. A matched code is pushed on the socket to that person. An unmatched code is pushed to connected admins and listed at `GET /api/admin/login-codes`. `GET /api/admin/login-code-help` lists customers who tapped I didn't get the code. `POST /api/admin/slots/:slotId/login-code` sends a code that admin typed. The dashboard includes `codeHelpOpen`.
- Login incidents: a seat holder reports a dead login, and an admin can resolve it.
- Notifications for provider expiry, customer expiry, seat changes, payment confirmation, and payments an admin still has to confirm. Each stored notice is pushed on the socket to that recipient before email. Payment and seat notices are urgent. Expiry warnings are not. Mail goes out only when SMTP is configured. A client reloads `GET /api/users/notifications` after reconnecting.
- Payments. The customer chooses manual verification or an online payment. Manual payments and any online payment the gateway cannot confirm email every admin. `GET /api/admin/payments` filters by `verification` (`MANUAL` or `ONLINE`) and `status`. `GET /api/admin/payments/awaiting` lists the ones waiting for an admin. Ihella is called only when its API is configured. Credentials stay hidden from the customer until the payment is confirmed.

## Not in this service

- An admin website.
- A real Ihella charge contract. The HTTP port sends `providerRef` and accepts a signed webhook. It does not invent a successful charge when the API is unset.
- WhatsApp, and other people supplying their own subscriptions.

The product plan is in [ROADMAP.md](ROADMAP.md). The customer flow is in [USER_JOURNEY.md](USER_JOURNEY.md). The operator job is in [ADMIN_FEATURES.md](ADMIN_FEATURES.md).
