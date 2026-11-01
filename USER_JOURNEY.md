# BuddyPass user journey

BuddyPass buys premium streaming accounts wholesale, splits each one into seats, and sells those seats by the month in Burundian francs.

Pricing, the admin catalog, and admin capabilities are in [ROADMAP.md](ROADMAP.md). This file is the customer flow.

## Journey

1. A visitor sees the service catalog. In the worked example, Netflix is listed at 25,000 francs per seat. That figure is illustrative, not a final price. Pricing is in [ROADMAP.md](ROADMAP.md).
2. They create an account and complete a profile before they can order. Required: full name, email, phone in international form (such as +25779123456), and country of residence. The email is confirmed from a link and is not edited on the profile. Optional, from timezone onward: timezone, age, where they heard about BuddyPass, and other metadata. A Google account is already verified.
3. They place an order. The system checks how many seats are free. If none are free, the order waits. They can see their place for that service and country, and they can cancel while it is still pending.
4. The order shows seat availability, the price, and two ways to pay: manual verification with the admin, or an online payment.
5. They choose. Manual verification emails the admin. The customer pays the admin directly and can send a confirmation note. The admin confirms that payment. An online payment uses a gateway. Ihella confirms itself when its API is configured. Lumicash and Bancobu eNoti wait for the admin until that gateway can charge on its own. The seat stays with the customer while a payment is waiting for the admin.
6. When the payment is confirmed, BuddyPass tells them the seat is ready. They open the app and see the account email and password.
7. The user enters those credentials on their own device. BuddyPass does not sign them in. If the service asks for a code, they tap **Get verification code**. While they wait in line the app says "Queuing your request." and shows "Starts in about…". When their turn starts it says "It's your turn." and "Looking for your verification code." The code appears in the app. **Recheck** looks again. **I didn't get the code** tells an admin, who can type the code and send it to them.
8. The seat is monthly from the day they pay, not from the streaming service's billing date. Someone who joins on 20 November is due again on 20 December. BuddyPass notifies them about one week before that date, and again as it nears. They are not notified when the admin must renew the account with Netflix.
9. If their own seat is still unpaid past their due date, BuddyPass blocks it.
10. Renewal repeats the same path: choose manual or online, open the login, and tap **Get verification code** when a service asks for one. Their next month starts from that renewal, still independent of the provider date.
11. If they never renew, the seat is freed for someone else. A returning user can be given another seat.
