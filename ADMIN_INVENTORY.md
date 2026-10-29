# Admin inventory

Updated 2026-10-23. This repo has no admin website. The admin side is API routes behind an admin login. Swagger is at `/api-docs`.

## In place

- Admin login gate, plus a script to create the first admin. A signed-in admin can create another admin and change a person's role.
- User management: list, view (seats and pending requests), edit name and avatar, change role, verify, activate or deactivate, and delete. An admin cannot suspend their own account.
- Dashboard: user, subscription, and provider counts; seat inventory per service (total, taken, free); waiting count; accounts whose provider date is inside the next week; newest open capacity alerts.
- Waiting line is read-only. A free seat is assigned immediately. A full pool fills first-in, first-out. There is no accept, reject, or manual assign.
- Capacity alerts open when the last allocatable account in a provider-and-country pool takes its first seat, or when people waiting already outnumber free seats. The alert names who is waiting. `POST /api/admin/capacity-alerts/:alertId/accounts` creates the next login for that pool. Signup at the streaming service stays manual.
- Providers, countries, and currencies. A provider can have an icon. A shared account stores wholesale cost, seat price, seat count, provider expiry, and encrypted credentials.
- Password replacement overwrites the stored secret. The next reveal is the new password. Each reveal is stored.
- Two clocks. The provider date does not evict seated people and is warned to admins only. The customer month starts when payment is confirmed. An unpaid new seat is held for 24 hours. A finished unpaid month is blocked for 3 days, then freed. Renewal keeps the same seat.
- Public offers at `GET /api/offers`: icon, description, price, currency, and free seats. No streaming email and no wholesale cost.
- Login codes by per-seat alias, with an unmatched list for the admin. Polling runs when IMAP is configured.
- Login incidents: a seat holder reports a dead login, and an admin can resolve it.
- Notifications for provider expiry, customer expiry, seat changes, and payment confirmation. Mail goes out only when SMTP is configured.
- Payments. Ihella is called only when its API is configured. Lumicash and Bancobu eNoti wait for an admin to confirm. Credentials stay hidden from the customer until the payment is confirmed.

## Not in this service

- An admin website.
- A real Ihella charge contract. The HTTP port sends `providerRef` and accepts a signed webhook. It does not invent a successful charge when the API is unset.
- WhatsApp, and other people supplying their own subscriptions.

The product plan is in [ROADMAP.md](ROADMAP.md). The customer flow is in [USER_JOURNEY.md](USER_JOURNEY.md). The operator job is in [ADMIN_FEATURES.md](ADMIN_FEATURES.md).
