# Flutterwave Payment Integration Skill — SecureGate

This document defines how we integrate Flutterwave to unlock the premium dashboard tier. By integrating this secure billing gateway, we authenticate payment statuses asynchronously via secure webhooks.

---

## 1. The Checkout Flow Architecture

```
User (Dashboard) --[Click Upgrade]--> initiate API --[Redirect URL]--> Flutterwave Checkout
                                                                                |
                                                                             Payment
                                                                                |
User (Dashboard) <--[Polled / Redirected]-- Webhook API <--[HTTP POST Webhook]--+
```

1. **Dashboard CTA:** An authenticated user clicks the "Upgrade to Premium" button on `/dashboard`.
2. **Initiation Handshake:** A POST request is dispatched to `/api/payment/initiate`. It generates a transaction reference, calculates pricing metadata, and generates a Flutterwave hosted checkout link.
3. **Redirection:** The client is redirected to Flutterwave.
4. **Asynchronous Webhook:** Once payment completes, Flutterwave fires an HTTP POST webhook request containing transaction metadata to `/api/payment/webhook`.
5. **Upgrade Verification:** The webhook endpoint verifies the signature, isolates the payload, matches the user record via transaction identifiers, and updates the database to set `isPremium: true`.

---

## 2. Secrets & Configuration

To integrate safely, secure these environment configurations (never commit these values to source code):
* `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`: Used to identify the gateway account.
* `FLUTTERWAVE_SECRET_KEY`: Used server-side to communicate with Flutterwave's endpoints.
* `FLUTTERWAVE_WEBHOOK_SECRET`: A custom shared secret set in the Flutterwave dashboard and passed in HTTP headers during webhook dispatches.

---

## 3. Webhook Signature Security

Every webhook request must be treated as hostile until the signature is validated:
* **Headers Token:** Flutterwave appends a `verif-hash` header on webhook POST requests.
* **Validation Assert:** The server must compare this header to the local `FLUTTERWAVE_WEBHOOK_SECRET`.
* **Equal Match:** Only process payloads where `verif-hash === FLUTTERWAVE_WEBHOOK_SECRET`. Reject mismatches with `401 Unauthorized` immediately to block fake upgrade attempts.
* **Double Spend Defense:** Track and double-verify transaction reference parameters before altering user DB properties to prevent multi-use replay attacks.
