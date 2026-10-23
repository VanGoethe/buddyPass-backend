# Admin inventory

Read on 2026-10-23. This repo has no admin website. The admin side is API routes behind an admin login. An admin screen would still have to be built.

## Already there

- Admin login gate, plus a script to create the first admin.
- User management: list, view, edit name and avatar, change role, activate or deactivate, and delete.
- A dashboard with three counts — users, subscriptions, and providers — and the newest open capacity alerts.
- A list of those capacity alerts.
- Full create, edit, and delete for providers, countries, currencies, and shared accounts.
- The streaming password is encrypted when the admin saves an account, and an admin can reveal it.
- Seats assign themselves, a released seat fills the next person in line, and an hourly job drops seats when an account’s expiry date has passed.

## Partial

- The dashboard does not show seats total, taken, and free per service. That has to be inferred from each account.
- Capacity alerts warn and then clear themselves. They do not list who is waiting, and they do not create the next account.
- Credentials are fields on the account, not a catalog offer. There is no icon, no full account cost, and no separate seat price entered as the offer.
- Expiry is one date on the account. There are no two renewal clocks and no reminders.
- An admin cannot mark a user verified, so an email signup still cannot order.

## Absent

- Any admin pages.
- An order queue that runs without someone checking it by hand.
- Payment monitoring, including Ihella, Lumicash, and Bancobu eNoti.
- A 2FA inbox that routes codes by alias.
- Admin-only notices when the streaming service itself must be renewed.
- Blocking an unpaid seat, freeing it, and giving a returning customer another seat.
- Notifications to the admin or the customer.

The product plan is in [ROADMAP.md](ROADMAP.md). The customer flow is in [USER_JOURNEY.md](USER_JOURNEY.md).
