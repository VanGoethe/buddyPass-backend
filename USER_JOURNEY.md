# BuddyPass user journey

BuddyPass buys premium streaming accounts wholesale, splits each one into seats, and sells those seats by the month in Burundian francs.

Pricing, the admin catalog, and admin capabilities are in [ROADMAP.md](ROADMAP.md). This file is the customer flow.

## Journey

1. A visitor sees the service catalog. In the worked example, Netflix is listed at 25,000 francs per seat. That figure is illustrative, not a final price. Pricing is in [ROADMAP.md](ROADMAP.md).
2. They create an account and complete a full profile before they can order.
3. They place an order. The system checks how many seats are free.
4. The order shows seat availability, the price, and the payment options.
5. They pay. BuddyPass monitors the payment automatically through the provider's API. The first route is Ihella. Lumicash is a secondary route. Gateway choice stays out of this pass. What matters is that payment confirmation is automatic.
6. When the payment is confirmed, BuddyPass delivers the account credentials.
7. The user enters those credentials on their own device. If the service asks for a code, that code goes to an admin-controlled email. Aliases match the code to this user. BuddyPass retrieves it and shows it in the product so they can finish logging in.
8. The seat is monthly from the day they pay, not from the streaming service's billing date. Someone who joins on 20 November is due again on 20 December. BuddyPass notifies them about one week before that date, and again as it nears. They are not notified when the admin must renew the account with Netflix.
9. If their own seat is still unpaid past their due date, BuddyPass blocks it.
10. Renewal repeats the same path: pay, receive credentials, and receive a code in BuddyPass when a service asks for one. Their next month starts from that renewal, still independent of the provider date.
11. If they never renew, the seat is freed for someone else. A returning user can be given another seat.
