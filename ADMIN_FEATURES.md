# Admin features

The admin job for the founder pool in [ROADMAP.md](ROADMAP.md). The founder is the only supplier. Every shared login is one of their own streaming subscriptions. Admin tools are how those accounts are stocked, renewed, and restocked.

Today the admin side is API routes behind an admin login. There is no admin website. Swagger is the only surface. This file describes the operator job, not a website this backend has to ship.

The pool has to work before money does. Join, the catalog, the waiting line, working logins, login codes, seat terms, and restock come first. Charging a seat comes after that loop holds up on a real account. Other people supplying seats, and the WhatsApp assistant, wait until then.

## Admin login and roles

An admin signs in with the same login as everyone else and is let through only when the account role is admin. The first admin can be created from a script. A signed-in admin can create another admin and can change a person's role.

## Dashboard

The operator home. It shows seat inventory per service: total, taken, and free. Free seats are total seats minus seats already taken. It also shows how many people are waiting, the shared accounts whose provider date falls inside the next week, and the newest open capacity alerts.

## User management

An admin can list people, open a profile, and see what that person holds: seats, pending requests, and whether the account is verified. The admin can verify a local account, which is what lets an email-and-password signup request a seat, or suspend it. Suspending blocks the person from signing in. The admin cannot suspend their own account. Name, avatar, and role can be edited, and an account can be deleted.

## Catalog and shared accounts

The admin manages the providers, the countries, and the currencies that are offered. Netflix is the first service. Prime Video, ChatGPT, and later services use the same fields.

Each offer has an icon, a description, the full account cost, how many seats that account holds, and the price per seat. The customer sees the offer, the price, and how many seats are free. They do not see the streaming email until they hold a seat.

Creating a shared account means the admin has already opened that account at the streaming service, then enters it here. The fields are the provider, the country, the seat count, the wholesale cost, the price per seat, and the provider expiry date, plus the account email and password. Those credentials are what a seat holder receives. Retiring an account stops it from taking new seats. The password is stored encrypted. An admin can reveal it, and each reveal is stored.

When the admin replaces the password, current holders read the new one on the next reveal, and the old value is gone.

## Waiting line

A free seat is assigned immediately. A full pool leaves the request pending and fills it first-in, first-out when a seat appears. The admin does not accept a request, reject it, or pick which shared account a person gets.

What the admin sees is the line: the person, the service, the country, the time they asked, and their place in line. Adding the next account fills whoever is already waiting.

## Capacity and restock

An alert opens on its own. There is no threshold for the admin to set. It opens when the last allocatable account in a provider-and-country pool takes its first seat, or when people waiting already outnumber free seats.

An alert names the provider, the country, how many seats are still free, how many people are waiting, and who those people are. From that alert the admin creates the next login for the same provider and country. Streaming signup itself stays manual.

## Seat terms and two clocks

Each shared account has two clocks, and they are not the same date.

The provider clock belongs to the account the admin opened. An account created at Netflix on 1 November must be renewed with Netflix by 1 December, or Netflix cuts the account off. Only the admin is told. Renewing that account keeps the people already seated. It does not clear the pool.

The customer clock belongs to the seat. A customer who joins on 20 November is due on 20 December, even if the Netflix account itself renews on 1 December. Their seat is still valid on 1 December.

Before payment exists, a finished customer term still releases the seat and fills the line. The holder can also leave. Once a seat is paid for, an unpaid or ended term blocks the seat and then frees it for someone else. Renewal keeps the same seat. A returning customer can be given another seat.

## Login codes

Netflix, Prime, and similar services email a one-time code to the shared account address. The customer taps Get verification code. One person per account is active at a time, and later taps wait in a queue. BuddyPass matches the message to that person by the account email, the provider's sender domains, and the time the turn started. The mailbox has to receive that login address, by plus addressing or a catch-all. BuddyPass does not create those addresses. A matched code is pushed on the socket to that paid customer. A code that matches no one is pushed to connected admins. If the customer taps I didn't get the code, an admin can type it and send it to that seat.

## Login incidents

A seat holder can report that the login failed. The admin sees that report on the account and deals with it. A password change at the streaming service is a BuddyPass update, not something holders discover in silence.

## Notifications

A table of notices the system has sent. Each stored notice is pushed on the socket to that person before any email goes out. Payment notices and seat changes are marked urgent. Provider and customer expiry warnings are pushed too, and marked not urgent, because they come from the hourly sweep with a day or a week of lead time.

An expiry warning for the provider date goes only to the admin. An expiry warning for the customer's own date goes to that customer, about one week before and again as the date nears. A seat change is sent when a seat is assigned, blocked, freed, or renewed. A payment confirmation is sent once payments exist and a payment is recorded as paid. A client reconnects with a fresh access token and reloads its notice list. The socket does not replay what was missed.

## Payments

This comes after the founder pool holds up. Charging a seat is not part of assignment. The seat stays while the term is paid. An unpaid or ended term releases it back to the line. A payment that is waiting for the admin keeps the seat past that timer until the admin confirms or rejects it.

The customer chooses manual verification or an online payment.

Manual verification is the person-to-person path. The customer pays the admin directly and can send a short confirmation note. BuddyPass emails every admin that this person wants manual verification. The first note emails them again. The admin confirms the payment, the paid month starts, and the login opens. Rejecting it tells the customer they can try again.

Online payment is the gateway add-on. Ihella confirms itself when its API is configured. Lumicash and Bancobu eNoti, and an Ihella charge that was not created, wait for the admin. BuddyPass emails the admin for every payment they still have to confirm. A created Ihella charge does not.

Paid payments stay in those two categories, manual or online, including an online payment the admin confirmed by hand. The admin can list them separately. The notice is pushed on the socket as soon as it is stored, and emailed when SMTP is set. WhatsApp, or any later channel, delivers the same stored notice.

## Later

The WhatsApp assistant is a customer channel. It is not an admin page in this pass. A customer can browse, receive a service, renew their own monthly term, and be warned before that term ends. The provider renewal date stays with the admin.

Other people supplying their own subscriptions is out of this file until the founder pool is proven. Until then the founder is the only supplier.

## Admin interface

A later surface would be one page per section above: dashboard, users, catalog and shared accounts, the waiting line, capacity alerts, seat terms, login codes, login incidents, notifications, and payments. Each page does only what its section lists. This backend does not include that website. Today there is only the API and Swagger.
