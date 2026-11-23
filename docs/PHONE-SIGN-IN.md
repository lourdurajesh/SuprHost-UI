# Phone sign-in (SMS codes through MSG91)

Branches: `feat/phone-otp` in SuprHost-UI (from `ux/site-polish`) and in HostMate-Backend (from
`rollout/suprhost-v0.2-to-master`). Not merged: this ships with the customer-site release.

## What guests see

- **Sign in** (`/account/signin`): mobile number first (fixed +91, numeric keypad), "Send me a code
  by SMS", then the 6-digit code. "Use email instead" switches to the email code.
- **Checkout** (`/book`): a new guest types name, email and mobile number; the code goes to the
  mobile by SMS. "Confirm by email instead" before sending, or "No SMS? Get the code by email
  instead" on the code screen. The email typed at checkout is where confirmations go.
- **My trips**: bookings made on the website with the verified number, plus stays the host recorded
  in the PMS with the same phone number (however it was typed).
- Phone sign-in shows only when the API reports the `guest.phone_sign_in` feature, so the site falls
  back to email automatically where SMS isn't set up.

## Rules

- Indian mobile numbers only by default (`Notifications:Sms:AllowedCountryCodes`, default `["91"]`).
  International SMS is expensive and the main target of SMS-pumping fraud.
- At most one SMS per number every 30 seconds (API) and 3 per number per 15 minutes (website), plus
  the existing per-IP limits and Turnstile.
- Codes: 6 digits, 10 minutes, 5 attempts, stored hashed. Same as email codes.
- A guest signed in by phone must book with that number; another number is refused.
- Phone and email accounts are separate: signing in by email later shows bookings made with that
  email, signing in by phone shows bookings made with that number.

## Setting up MSG91 (one time, for the SuprHosts platform)

1. **DLT registration** (TRAI rule, required for any SMS in India). On one operator's DLT portal
   (Jio, Airtel, Vi or BSNL) register the business entity, a 6-letter **sender ID** (header, e.g.
   `SPRHST`) and a **content template** of type *Service Implicit*, for example:

   `{#var#} is your sign-in code for {#var#}. It expires in 10 minutes. Do not share it. - SuprHosts`

   Approval usually takes several working days. Note the template's DLT id.
2. **MSG91 account**: add the DLT entity id and sender ID, then create an SMS template with the
   same text, using MSG91 variables: `##otp## is your sign-in code for ##brand##. ...`. Link it to
   the DLT template id. Note MSG91's **template id**.
3. **Auth key**: MSG91 → API → create an auth key. Add the API server's outgoing IP to the key's
   whitelist if you turn whitelisting on.
4. **API settings** (secret store / Render environment, never appsettings):

   | Setting | Value |
   |---|---|
   | `Notifications__Sms__Provider` | `msg91` |
   | `Notifications__Sms__AuthKey` | the MSG91 auth key |
   | `Notifications__Sms__TemplateId` | the MSG91 template id |
   | `Notifications__Sms__CodeVariable` | `otp` (the variable name in the template) |
   | `Notifications__Sms__BrandVariable` | `brand` (empty if the text has no brand variable) |

   The API refuses to start with `msg91` and a missing key or template id, and refuses `log` in
   Production.
5. **Test**: sign in on the site with your own number. If no SMS arrives, check the MSG91 delivery
   report (a DLT mismatch between the text and the template is the usual cause) and the API log
   line `MSG91 rejected an SMS`.

## Local development

`suprhost-api-phone-otp` in `.claude/launch.json` runs the branch with
`Notifications__Sms__Provider=log` (nothing is sent; the log records that an SMS would go to the
last four digits) and `PublicApi__ExposeSignInCodes=true`, so the code appears on screen in an amber
"Test mode" box.

## Database

Migration `GuestPhoneSignIn` (additive): `phone` on `guest_sign_in_codes` and `guest_sessions`,
`verified_phone` on `guest_accounts`, `guest_phone` on `booking_holds`; `email` becomes optional on
the first three. Rolling it back fails once phone-only rows exist.
