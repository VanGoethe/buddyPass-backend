# BuddyPass roadmap

Plan date: 2026-10-23. Current state revised: 2026-11-01.

BuddyPass shares streaming-service accounts. An operator stocks a real login. A user requests a seat. A free seat hands that user the email and password. The first operator is the founder, using their own subscriptions. Once that loop is proven, other people can add and manage their own subscriptions and share seats on them.

This document is the product sequence. It does not change the API.

## The idea this sequence starts from

The working core is already the original idea:

- An admin stocks shared accounts (a subscription: provider, country, seat count, price, expiry, encrypted password).
- A verified user requests a seat for a provider and country.
- A free seat is assigned immediately. A full pool leaves the request pending and fills it first-in, first-out when a seat appears.
- The seat holder, or an admin, can reveal the email and password.
- Assignment will not overbook `maxSlots`. An hourly sweep releases seats on expired subscriptions. Capacity alerts tell the admin when the last allocatable account in a provider-and-country pool starts filling, or when pending requests already exceed free seats.

The name in the first committed description is a subscription-sharing platform: streaming providers such as Netflix and Spotify, seats, and a price per seat.

## Vision

### Near term: a founder-operated pool

The founder is the only supplier. Every shared login is one of their own streaming subscriptions. Admin tools are how those accounts are stocked, renewed, and restocked. Users are customers of that pool: they see what is offered, ask for a seat, receive a working login, use it for a term, and leave or get released when the term ends.

The loop is proven when a person who is not the founder can do that on a real account without the founder moving data by hand, and the founder can see when to add the next login before the pool is empty.

### Later: other people supply seats

The same seat engine stays. What changes is who owns the login. Another person can add a subscription they pay for, set the seats and the price, rotate the password, pause or renew it, and share the spare seats with other BuddyPass users. The founder’s admin role becomes the platform: catalog, assignment, capacity, trust, and disputes. The founder is one supplier among others, not the only one.

Opening supply comes after the founder pool holds up. Other people’s passwords and reputations go into the system only once reveal, renewal, incidents, and payment already work for a single operator.

## Burundi reseller offer

The first commercial shape is a shared-subscription reseller. A customer pays a monthly fee in Burundian francs and receives a premium streaming login, such as Netflix. In public it is a subscription service that manages resellers. It does not advertise itself as a shop for shared accounts.

The figures below are an example, not a final price. A $20 Netflix account is about 120,000 francs at the proper rate. Split across about six seats, the account costs about 20,000 francs a seat. About 5,000 francs a seat is the reseller's margin, so a seat in this example is about 25,000 francs a month.

The admin opens the streaming service, such as Netflix, and sets the account up there. The admin catalog is built so more services can be added the same way. When an admin adds that service in BuddyPass they set the service type, an icon, a description, the full account cost, how many seats that account holds, and the price per seat, and they enter the credentials for the account they just created. Those credentials are what a customer receives after buying a seat. The customer signs in on the streaming service with them. Netflix is the first one. Prime Video, ChatGPT, and later services use the same fields.

The customer chooses manual verification or an online payment. Manual verification is confirmed by the admin after the customer pays them directly. Online payment through Ihella, Lumicash, and other gateways comes after that. Where the gateway can charge on its own, confirmation is automatic. Where it cannot, the admin is told and confirms it.

The step-by-step customer flow is in [USER_JOURNEY.md](USER_JOURNEY.md).

## Two renewal clocks

Each shared account has two clocks, and they are not the same date.

The provider clock belongs to the account the admin opened. An account created at Netflix on 1 November lasts one month and must be renewed with Netflix by 1 December, or Netflix cuts the account off. The admin is notified around that date. That notice goes only to the admin.

The user clock belongs to the seat. A customer who buys on 20 November gets a full month that ends on 20 December, and their renewal reminder is 20 December. Their seat is still valid on 1 December, so they are not told that Netflix needs renewing.

The admin renews the provider account before it lapses. The user's date stays anchored to the day they joined. The risk this avoids is a provider lapse cutting off a seat the customer has already paid for.

## Admin

The admin side runs the same loop without checking each order by hand.

- Seat inventory per service: total, taken, and free.
- Seat assignment stays automatic.
- The customer chooses manual verification or an online payment. The admin confirms manual payments. A gateway confirms an online payment when it can charge on its own.
- The credentials the admin entered for each account, delivered to the buyer of a seat.
- A 2FA inbox watch that routes each code to the one active claim on that shared account.
- Expiry and renewal notifications on both clocks: the provider date to the admin only, the seat date to that customer.
- Blocking a seat when it is past due, and freeing it when it is not renewed.
- Reassignment of a freed seat, including to a returning user.
- An admin dashboard for this inventory, the orders, and the alerts.

## WhatsApp assistant (V1.5)

V1.5 sits between the current product and the fuller later version, where other people supply seats. WhatsApp is an automation layer that brings BuddyPass closer to the customer. BuddyPass itself stays the main channel.

The assistant is reached through the WhatsApp API with its own keys. A customer can chat with it to browse and get every BuddyPass service inside WhatsApp. Subscriptions are monthly and end on that customer's own date. The assistant handles their renewal, and it notifies them when their seat is about to end. The provider renewal date stays with the admin.

## Automatic seat renewal (version undecided)

An idea to keep, not a committed milestone. Van has not chosen a version. It might be V1.5, V2, or V3.

Manual monthly renewal is a friction point in Burundi. A user would link a payment method on their profile — Lumicash, Ihella, Bancobu eNoti, or card — and set a preferred renewal day for each service. On that day each month, BuddyPass charges that method and renews the seat.

Ihella is the first provider to pursue. Van knows them personally, and their API already covers Lumicash and Bancobu eNoti. He does not have that API yet, and access has been difficult. That access is an open dependency. The same automatic-renewal capability is worth pitching to Ihella so they could offer it on their side.

Where the provider API can charge on its own, renewal is fully automatic. Lumicash and Bancobu eNoti may not work that way. For those, BuddyPass notifies Van that a user wants to renew and pay by that method, and he completes it with the customer directly, the same way Ustream Zone does.

## Current state

Revised 2026-11-01 so this section matches the API. The sequence below is still the plan. `ADMIN_INVENTORY.md` is the operator checklist.

### In the API

The founder is still the only supplier. Subscriptions have no owner, there are no payouts, and there is no WhatsApp assistant. There is no admin website. Swagger at `/api-docs` is the admin surface.

- Register, log in, refresh, log out, and Google sign-in. Google links an existing account only when that account is already verified. A new Google account is created already verified.
- A local account confirms its email from a link (`POST /api/users/verify-email`, resend at `POST /api/users/verification-email`). Someone who is locked out can reset a password (`POST /api/users/forgot-password`, `POST /api/users/reset-password`). The reset revokes refresh tokens and does not open a session. Both links need SMTP and `APP_PUBLIC_URL`. An admin can still verify or block a local account with `PUT /api/admin/users/:userId/verification`. A signed-in user can change their password.
- The profile stores full name, phone, country, and optional timezone, age, where they heard about BuddyPass, and metadata. Email is shown and not changed here. `POST /api/subscriptions/request` returns 403 until the name, phone, and country are set. People who already have a seat are not backfilled.
- Admins manage users, service providers, countries, currencies, and subscriptions. A provider can store an icon. An account stores wholesale `accountCost`, seat `userPrice`, `maxSlots`, provider `expiresAt`, and an AES-256-GCM password.
- Public `GET /api/offers` lists provider, country, icon, description, price, currency, and free seats. Streaming emails and wholesale cost stay off that response. A seat request sends `serviceProviderId` and `countryId`, which the offer includes.
- Seat assignment is transactional and first-in, first-out, and will not overbook `maxSlots`. Releasing a seat fills the next pending request. An hourly sweep applies the payment hold, the post-term block, and the release. A payment that is waiting for an admin keeps the seat until that payment is confirmed or rejected.
- The provider clock and the customer clock are separate. Renewing `expiresAt` keeps current holders. An account past that date takes no new seats until it is renewed. The customer month starts when payment is confirmed (`termStartsAt`, `termEndsAt`). A new unpaid seat is held for `SEAT_PAYMENT_HOLD_HOURS` (24). After the paid month, the seat stays blocked for `SEAT_BLOCK_GRACE_DAYS` (3), then it is freed. The holder can leave, which releases the seat. Early-leave proration is not decided. `renewalInfo` is still an unstructured JSON field and is not the term.
- Credentials stay hidden until the seat is paid. Reveal returns the email and password to the paid seat holder or an admin, is not cached, and is stored. Replacing the password overwrites the stored secret, so the next reveal is the new one.
- Each seat still has an email alias. A shared streaming login does not use that alias for its code. The customer taps Get verification code, which queues one active turn per account. BuddyPass matches the next inbox message to that turn by the account email, the provider's sender domains, and the time the turn started. Later taps wait, with a short countdown, and the copy changes when their turn starts. Codes are kept for 15 minutes. Unmatched codes go to connected admins.
- A seat holder can report a dead login. Admins list and resolve those incidents.
- Notices are stored and pushed on socket.io at `/socket.io` before email. Mail sends only when SMTP is configured. Kinds in use: provider expiry (admins only), customer term expiry, seat assigned / blocked / freed / renewed, payment confirmation, payments an admin must verify, and a customer who did not receive a verification code.
- Capacity alerts open when the last allocatable account in a provider-and-country pool takes its first seat, or when pending requests exceed free seats. They name who is waiting and include pace and ETA. `POST /api/admin/capacity-alerts/:alertId/accounts` stocks the next login for that pool. Signup at the streaming service stays manual.
- The admin dashboard shows inventory per service (total, taken, free), the waiting count, provider dates inside the next week, open alerts, payments to verify, and open verification-code help. `GET /api/admin/waiting-line` is read-only and includes place in line. `GET /api/subscriptions/requests` uses the same numbering for the caller. `DELETE /api/subscriptions/requests/:requestId` cancels that caller's pending request. Assignment stays automatic.
- The customer chooses manual verification or an online method (Ihella, Lumicash, Bancobu eNoti). The amount comes from the account. Manual payments, Lumicash, eNoti, and an Ihella charge that was not created wait for an admin, and every admin is emailed. A confirmed payment starts or extends that customer's month on the same seat. The Ihella client posts to `/charges` and the webhook checks an HMAC of the raw body. It does not invent a successful charge when the API is unset.

### Still open

Milestones 1 through 7 are in the API. Milestone 7 covers manual confirmation and gateways that wait on an admin. They count as done only after they run on a real streaming account the founder shares.

- A live Ihella charge waits on API access. Manual verification does not.
- After any payment is confirmed, BuddyPass tells the customer the seat is ready and they fetch the login. Get verification code queues one turn per account and relays the inbox code into the app. A real code still needs the mailbox to receive that streaming login address. See [After payment is confirmed](#after-payment-is-confirmed).
- Saved payment methods and automatic monthly charging are not built. That idea is still unversioned.
- WhatsApp, other people owning subscriptions, and one catalog across owners are not started.

### Milestone status

| Milestone | Status |
| --- | --- |
| 1. A new user can ask for a seat | In the API, including email verification, password reset, and the profile required before a request. |
| 2. The pool is a catalog | In the API. |
| 3. The waiting line is visible | In the API. The customer sees the same place numbers as the admin line and can cancel a pending request. |
| 4. The login keeps working after handoff | In the API. Confirmation starts the handoff. A shared login's code is matched to the one active claim, and later taps wait in a queue. |
| 5. A seat has a term | In the API. |
| 6. Restock from the alert | In the API. |
| 7. A seat is paid | In the API. Live Ihella charging waits on the real contract. |
| 8. Other people own subscriptions | Not started. |
| 9. The catalog lists every approved owner | Not started. |

The post-confirmation handoff is in the API: a confirmed payment tells the customer the seat is ready, and Get verification code relays the inbox code to the one active claim. A live run on a real account still has to prove the seat, the month, and a code that actually arrives. WhatsApp (V1.5) and other owners wait until that run holds up.

## End state

A user opens a catalog of offers by service and country, with a price and a free-seat count, and no streaming email on that page. They verify their BuddyPass account, request a seat, and either receive it or stand in a line they can see and leave. When the seat is theirs they can read the current email and password. A login code for that seat shows up in the app. If the password changes, they see the new one. If it does not work, they say so and the owner deals with it. The seat lasts for a paid term. Leaving early or reaching expiry frees the seat for the next person in line.

The founder runs that for their own accounts first. After it is reliable, any approved member can list a subscription they own, manage its login and its term, and fill its spare seats through the same assignment rules. Holders still see credentials only for their own seat. The owner sees their account and its occupants. The platform admin sees every pool, every open alert, and every incident.

## Milestones

Each milestone is done when the outcome is true on a real streaming account, not when a field exists. Where the API stands against that list is in [Current state](#current-state).

### 1. A new user can ask for a seat

Email verification for local accounts, and a password reset for people who are locked out. An admin can still approve or block an account.

Outcome: someone who registers with email and password can become verified and call the seat request. Google remains a second way in.

### 2. The pool is a catalog

A public offer per provider and country: plan name, price, currency, and how many seats are free. Account emails stay off this response. A request is made from an offer, not from a raw provider id.

Outcome: a user can see what the founder is sharing and join it without being handed an id.

### 3. The waiting line is visible

Cancel a pending request. Show place in line. Show a clear status when the seat is assigned. Outbound email can come later; the product record has to change where the user already looks.

Outcome: a full pool is a line the user can stand in or step out of, and they can tell when they have a seat.

### 4. The login keeps working after handoff

Keep reveal as it is: seat holder or admin, not cached. Add a stored record of reveals. Let a holder report that the login failed. When the admin replaces the password, current holders read the new one on the next reveal, and the old value is gone.

Outcome: a password change at the streaming service is a BuddyPass update, and a dead login is reported instead of discovered in silence.

Login codes for Netflix, Prime, and similar services ship with this milestone. A shared login is matched to the one active claim on that account. Later taps wait in a queue. The approach is in [Two-factor authentication](#two-factor-authentication).

### 5. A seat has a term

Renewing the provider account keeps the people already seated. That date is separate from each customer's own month, which is described in [Two renewal clocks](#two-renewal-clocks). Expiry of a customer's unpaid seat still releases it and fills the queue. The holder can leave, which release already allows. Each clock is a real start and end, not only an `expiresAt` timestamp and a blob of renewal JSON.

Outcome: the founder can renew Netflix without evicting the pool, and a finished term returns the seat to the line.

### 6. Restock from the alert

Keep the current alert: it opens when the last allocatable account in a provider-and-country pool takes its first seat, or when pending requests exceed free seats. Add the waiting count and a direct path to create the next login for that same provider and country. Signup at the streaming service stays manual.

Outcome: the alert is the founder’s restock list, and adding an account fills whoever is already waiting.

Milestones 1 through 6 prove the loop on the founder’s own subscriptions.

### 7. A seat is paid

Charge the stored seat price for a term. The seat stays while the term is paid. An unpaid or ended term releases it back to the line. Decide proration for someone who leaves early before building it. Receipts can be minimal; the seat and the payment have to match.

Outcome: holding a seat on the founder’s account costs the price on the offer, and stopping payment frees the seat.

This stays inside the founder pool. It is the money model the multi-owner phase will reuse.

Confirming the payment, by any method, is what starts [After payment is confirmed](#after-payment-is-confirmed). The paid flag alone does not hand over the login or the verification code.

### 8. Other people own subscriptions

A subscription has an owner. The founder’s current accounts are owned by the platform admin. Another member can create a subscription they pay for, set seats, country, and price, rotate the password, pause it, and renew it. Assignment, the waiting line, reveal, incidents, and capacity alerts stay the same engine. Reveal is allowed for the seat holder, that subscription’s owner, and a platform admin. The owner sees occupants of their own accounts. They do not see other owners’ passwords.

Trust before the offer is public: the platform can approve, suspend, or remove an owner, and a holder can report an owner whose login fails or changes without notice. Payouts to owners use the payment path from milestone 7, with a platform fee decided before the first outside offer is listed.

Outcome: a second person can stock their own streaming login and fill its seats through BuddyPass, and the founder can shut that listing down if it breaks.

### 9. The catalog lists every approved owner

Offers from the founder and from other owners appear in the same catalog, with the same price, country, and free-seat count. The streaming email is still hidden until a seat is assigned. Pulling an account, failing renewal, or a suspended owner releases or blocks seats under the same term rules.

Outcome: BuddyPass is a pool of many people’s spare seats, and the founder’s accounts are one source of supply.

## After payment is confirmed

Added 2026-11-01. This sequence starts when a payment becomes paid. It is the same for manual verification, Ihella, Lumicash, and Bancobu eNoti. How the money was confirmed does not change what the customer receives next.

1. BuddyPass gives that customer the email and password for the subscription they paid for. Credentials stay hidden until this confirmation.
2. The customer types those credentials into the streaming service on their own device. BuddyPass does not sign them in there.
3. Most of those services send a one-time verification code to the account email.
4. BuddyPass reads that inbox, takes the code that service just sent, brings it into the BuddyPass app, and tells the customer, so they can type it on the device where they are signing in.

Confirming a payment pushes `seat-ready` on the socket. The payload has no email and no password. The app fetches the login, and the customer types it on their own device. **Get verification code** joins a queue for that account. The first person is active and BuddyPass reads the inbox immediately. Anyone behind them sees a countdown. The words change when their turn starts. **Recheck** reads again while they are active and keeps their place while they are waiting. **I didn't get the code** tells every admin, who can type the code and send it to that customer. The matching rules are in [Two-factor authentication](#two-factor-authentication). A live code still needs the mailbox to receive the streaming login address.

## Two-factor authentication

Netflix, Prime, and similar services email a one-time code to the account address. People sharing one login share that address, so the message does not name which BuddyPass user asked for it. A per-seat alias cannot work on that shared login, because the service mails the account address.

The identity comes from BuddyPass. **Get verification code** records who asked, on which seat, on which account. Only one claim on an account is active. BuddyPass delivers a code to that person when the message was sent to the account email, the sender's domain is one the provider allows, and the mail arrived after that turn started. A queued claim is not eligible. Later taps wait in line, see a short countdown, then different copy when their turn starts. The app does not say that someone else is signing in.

A message addressed to the seat alias still matches that seat first. That only matters when an account's login email is unique to one seat.

On the founder's accounts the mailbox is the admin's. The streaming login address has to land in that mailbox, by plus addressing or a catch-all. BuddyPass does not create those addresses.

That push is the relay in [After payment is confirmed](#after-payment-is-confirmed).

## Order

1. Finish join and the customer's waiting line, so a stranger can enter the founder's pool. The catalog is already public.
2. Working logins, login codes, terms, and restock are in the API. Prove them on a live account the founder shares.
3. Payment on founder-owned seats is in the API, in francs. Manual confirmation works without Ihella. A live Ihella charge waits on API access.
4. After any payment is confirmed, hand the customer the streaming login and relay the service's verification code from the inbox into the app. The handoff, the queue, and the admin fallback are in the API. Prove them on a live account whose mail reaches the inbox.
5. WhatsApp assistant (V1.5): browse and receive services in chat, renew the monthly term, and warn before it ends.
6. Other owners, with approval and a way to pay them.
7. One catalog for every approved owner.

Steps inside a milestone can ship together. Later milestones wait until the earlier outcome is true on a live account the founder actually shares.
