# BuddyPass roadmap

Date: 2026-10-23

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

Payment is monitored automatically. The first route is Ihella. Lumicash is a secondary route.

The step-by-step customer flow is in [USER_JOURNEY.md](USER_JOURNEY.md).

## Two renewal clocks

Each shared account has two clocks, and they are not the same date.

The provider clock belongs to the account the admin opened. An account created at Netflix on 1 November lasts one month and must be renewed with Netflix by 1 December, or Netflix cuts the account off. The admin is notified around that date. That notice goes only to the admin.

The user clock belongs to the seat. A customer who buys on 20 November gets a full month that ends on 20 December, and their renewal reminder is 20 December. Their seat is still valid on 1 December, so they are not told that Netflix needs renewing.

The admin renews the provider account before it lapses. The user's date stays anchored to the day they joined. The risk this avoids is a provider lapse cutting off a seat the customer has already paid for.

## Admin

The admin side runs the same loop without checking each order by hand.

- Seat inventory per service: total, taken, and free.
- Order handling is automatic. There is no manual verification step.
- Payment monitoring through the provider API.
- The credentials the admin entered for each account, delivered to the buyer of a seat.
- A 2FA inbox watch that routes each code by alias.
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

In place today:

- Register, log in, refresh, log out, and Google sign-in. Google links an existing account only when that account is already verified.
- Admins manage users, service providers, countries, currencies, and subscriptions.
- Streaming passwords are encrypted with AES-256-GCM. Reveal returns the email and password to the active seat holder or an admin, and the response is not cached.
- Seat assignment is transactional and first-in, first-out. Releasing a seat fills the next pending request. Expired subscriptions drop their seats on an hourly sweep.
- Capacity alerts are listed at `GET /api/admin/capacity-alerts` and summarized on the admin dashboard. Creating the next streaming account stays manual.

The loop is not closed:

- A local account is unverified, and a seat request requires a verified user. There is no verification step and no password reset, so email-and-password users cannot join the pool. Google sign-in is the path that can.
- Offers are not browsable. Provider, country, and currency lists are public. Price, plan, and free seats live on subscriptions, and those endpoints are admin-only. A user has to already know a provider id.
- A pending request can be listed. It cannot be cancelled. `CANCELLED` and `REJECTED` are unused. The user has no queue position and no signal when a seat opens. Capacity timing is admin-only.
- `userPrice` is stored. Nothing charges it, and releasing a seat has no money consequence. Payments, outbound email, and an admin UI are outside this service today.
- A password change does not reach the other holders. There is no report when a login stops working, no stored history of who revealed a password, and no profile or PIN for shared plans. Expiry releases everyone. Renewal is an unstructured JSON field, not a flow that keeps seats.
- A capacity alert warns and then clears itself when the pool recovers. It does not show the waiting queue or turn into the next subscription.

## End state

A user opens a catalog of offers by service and country, with a price and a free-seat count, and no streaming email on that page. They verify their BuddyPass account, request a seat, and either receive it or stand in a line they can see and leave. When the seat is theirs they can read the current email and password. A login code for that seat shows up in the app. If the password changes, they see the new one. If it does not work, they say so and the owner deals with it. The seat lasts for a paid term. Leaving early or reaching expiry frees the seat for the next person in line.

The founder runs that for their own accounts first. After it is reliable, any approved member can list a subscription they own, manage its login and its term, and fill its spare seats through the same assignment rules. Holders still see credentials only for their own seat. The owner sees their account and its occupants. The platform admin sees every pool, every open alert, and every incident.

## Milestones

Each milestone is done when the outcome is true on a real streaming account, not when a field exists.

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

Login codes for Netflix, Prime, and similar services ship with this milestone. The approach is in [Two-factor authentication](#two-factor-authentication).

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

### 8. Other people own subscriptions

A subscription has an owner. The founder’s current accounts are owned by the platform admin. Another member can create a subscription they pay for, set seats, country, and price, rotate the password, pause it, and renew it. Assignment, the waiting line, reveal, incidents, and capacity alerts stay the same engine. Reveal is allowed for the seat holder, that subscription’s owner, and a platform admin. The owner sees occupants of their own accounts. They do not see other owners’ passwords.

Trust before the offer is public: the platform can approve, suspend, or remove an owner, and a holder can report an owner whose login fails or changes without notice. Payouts to owners use the payment path from milestone 7, with a platform fee decided before the first outside offer is listed.

Outcome: a second person can stock their own streaming login and fill its seats through BuddyPass, and the founder can shut that listing down if it breaks.

### 9. The catalog lists every approved owner

Offers from the founder and from other owners appear in the same catalog, with the same price, country, and free-seat count. The streaming email is still hidden until a seat is assigned. Pulling an account, failing renewal, or a suspended owner releases or blocks seats under the same term rules.

Outcome: BuddyPass is a pool of many people’s spare seats, and the founder’s accounts are one source of supply.

## Two-factor authentication

Netflix, Prime, and similar services email a one-time code to the account address. People sharing one login would otherwise share one inbox, and the code would not name who asked for it.

Each seat gets its own email alias. The alias forwards to the admin's master mailbox. The service sends the code to that alias, so the message that arrives is already that seat, and that seat is the user mid-login. BuddyPass pushes the code to them in the app. Nothing is matched or guessed.

A shared IMAP inbox that tries to pair a code with a user is only a fallback, for a service that will not send to a per-seat alias.

On the founder's accounts the mailbox is the admin's. When other people own subscriptions, a seat's alias forwards to that owner's mailbox the same way.

## Order

1. Join, catalog, and the waiting line, so a stranger can enter the founder’s pool.
2. Working logins, login codes, terms, and restock, so the pool survives contact with a real streaming service.
3. Payment on founder-owned seats, in francs.
4. WhatsApp assistant (V1.5): browse and receive services in chat, renew the monthly term, and warn before it ends.
5. Other owners, with approval and a way to pay them.
6. One catalog for every approved owner.

Steps inside a milestone can ship together. Later milestones wait until the earlier outcome is true on a live account the founder actually shares.
