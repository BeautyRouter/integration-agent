---
name: beauty-router-webhooks
description: Receive Beauty Router webhooks on a server, and set up the emails Beauty Router sends. Use for a webhook endpoint, the Beauty-Router-Signature header, HMAC verification, webhook secrets and rotation, the webhook source IP address, retries, repeated or out-of-order events, event types such as order.created, and emails to salon users.
---

# Beauty Router: webhooks

This skill covers the events Beauty Router sends to your server: product match updates, verification results, new orders, and order updates. It also covers the emails Beauty Router sends to your users, because they use the same setup in the salon software admin area.

Whether your salon software needs a webhook endpoint is in Your webhook URL in https://docs.beautyrouter.com/webhooks.md. Beauty Router delivers events from the moment the webhook URL is set.

## Rules

### Signature

- Verify the signature on the raw body, exactly as it arrived. A body that was parsed and serialized again has a different signature.
- `Beauty-Router-Signature` has `t`, the time in Unix seconds, and `v1`, the hex HMAC-SHA256 of `<t>.<raw body>`, with your webhook secret as the key.
- While several secrets are live, the header has one `v1` per live secret. Read every `v1`, and accept the event if any of them matches.
- Reject the request when `t` is more than 5 minutes old or more than 5 minutes in the future.
- Compare the result with each `v1` in constant time.

### Delivery

- Respond with a `2xx` status within 10 seconds. Do slow work after you respond. Otherwise Beauty Router retries with backoff for up to 24 hours.
- Delivery is at least once, so the same event can arrive more than once. Save the event `id` and skip an event you already handled.
- Events can arrive out of order. Compare `updatedAt` on the order or the product match with the one you saved, and keep the newer one.
- After 24 hours Beauty Router stops trying (`webhook_abandoned`). Fix the webhook URL, then read what you missed. For orders, use `GET /v1/orders`. It takes a user token, so log in once per company.

### URL and secrets

- Your salon software has one HTTPS webhook URL, on a public address. Beauty Router does not follow redirects.
- Generate a webhook secret first, then set the URL in the salon software admin area, because the admin area saves a webhook URL only once the app has a live secret. The admin area shows the secret once, so store it on your server right away. `br secrets create --webhook-secret <target>` creates one too, and writes it only to a git-ignored env file or to a secret store's command. In the sandbox, a coding agent creates the secret with the MCP server's `generate_webhook_secret` tool, which returns it once: append it straight to the project's git-ignored env file, and never print it or put it in code or a message. A production secret never comes from the MCP server.
- To test on your machine, run the webhook relay in the sandbox: `br listen --dotenv <the env file> --forward-to <a localhost URL of the webhook route>`. Each copy has the exact signed body and headers, and gets one attempt.
- Each environment has its own webhook URL and secrets. Switch the webhook secret when you go live.
- Beauty Router sends every webhook from one fixed IP address, which the salon software admin area shows on the webhook screen. A firewall that allows only listed addresses needs it. Still verify the signature, because an IP address alone does not prove the sender.
- You can have up to 5 live secrets at the same time. Each one can have a lifetime, and you can revoke one. The last live secret cannot have a lifetime, and it cannot be revoked.

### Emails to salon users

- Beauty Router sends the emails for you, in your app's name. Your users have no Beauty Router login, so every link opens your salon software.
- Emails go to the address from the user's latest login. Order emails go to the users of the company. Company emails go only to users with `canManageCompany`. The Back in stock email goes only to the user who asked.
- The app name and the URL templates are required settings, as Get access in https://docs.beautyrouter.com/support.md lists. The app name cannot contain "Beauty Router".
- Each URL template is an HTTPS URL on one of your registered origins. Beauty Router replaces the placeholders with Beauty Router IDs: `{orderId}` only in `orderUrl`, `{productId}` only in `productUrl`, and `{companyId}` in any template.
- Replies go to Beauty Router's order support. When your users ask you about an order, a payment, a refund, or a delivery, send them there. Questions about your app stay with you.

## How to do it

### Handle events

1. Add a route that reads the raw body before anything parses it.
2. Verify the signature, and reject the request when it fails. The examples respond with `400`.
3. Parse the JSON. Skip the event when you already saved its `id`. Otherwise save it.
4. Respond with `2xx`, then handle the event.

This example uses Node.js with Express. The webhooks page has the same code for Python, PHP, Ruby, C#, Java, and Go.

```js
import crypto from "node:crypto";
import express from "express";

const webhookSecret = process.env.BEAUTY_ROUTER_WEBHOOK_SECRET;
const maxSkewSeconds = 5 * 60;

function isValidSignature(header, rawBody) {
  const parts = (header ?? "").split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value ?? "");

  if (!/^\d+$/.test(timestamp ?? "") || Math.abs(Date.now() / 1000 - Number(timestamp)) > maxSkewSeconds) {
    return false;
  }

  const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.`).update(rawBody).digest();

  return signatures.some((signature) => {
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  });
}

const app = express();

app.post("/beauty-router/webhooks", express.raw({ type: "application/json" }), (req, res) => {
  if (!isValidSignature(req.get("Beauty-Router-Signature"), req.body)) {
    return res.sendStatus(400);
  }

  const event = JSON.parse(req.body.toString("utf8"));
  // Skip the event when you already saved its id. Otherwise save it and handle it after you respond.
  res.sendStatus(200);
});
```

### Event types

Each event has `id`, `type`, `createdAt`, and `data`.

- `product_match.updated`: a product match was created as `matched` or changed status. `data` is the product match.
- `company.verification_updated`: the verification status changed, or a change after verification was approved or declined. `data` has `companyId`, `verificationStatus`, and `pendingChanges`.
- `order.created`: an order was created, after its charge attempt. `status` is `placed` or `payment_failed`, or `pending_verification` when the charge waits for verification. A `placed` order from a brand or distributor that confirms each order itself is not charged yet. `data` is the order.
- `order.updated`: the status, tracking, delivery address, or other order details changed, such as `payment_failed` to `placed`. `data` is the order.

`companyId` is the `company.id` that `POST /v1/login` returned for that company. The order has the same `companyId`, and `userId`, the `user.id` of the user who placed it. A draft sends no webhook. `order.created` is sent when the draft is placed.

### Rotate a secret

1. Generate a new secret in the admin area, or create it with `br secrets create`.
2. Put the new secret on your server.
3. Limit the lifetime of the old secret, so that it expires once all your servers use the new one.

If a secret leaks, generate a new secret and put it on your server, then revoke the leaked one in the admin area. It stops working at once.

### Set up the emails

1. In the salon software admin area, set your app's name. Your logo and accent color are optional.
2. Set the URL templates, and build the page each one opens. Each page signs the user in when needed, then shows the matching screen:
   - `orderUrl`, such as `https://app.example.com/orders/{orderId}`: `showOrder(element, orderId)`.
   - `productUrl`, such as `https://app.example.com/marketplace/products/{productId}`: `showProductDetails(element, productId, { marketplaceFeatures: true })`.
   - `verificationUrl`, such as `https://app.example.com/settings/verification`: `showVerification(element)`.
   - `marketplaceUrl`, such as `https://app.example.com/marketplace`: `showMarketplace(element)`.

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Orders and notifications section. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for exact payloads and settings. Do not guess them.

- Signature, events, and retries, with code for each language: https://docs.beautyrouter.com/webhooks.md
- Every email, the URL templates, and your own domain: https://docs.beautyrouter.com/emails.md
- Webhook failures in the admin area: https://docs.beautyrouter.com/errors.md
- Required settings, the webhook relay, and integration errors: https://docs.beautyrouter.com/support.md
- `br secrets create`: https://docs.beautyrouter.com/authentication.md
- `order.created`: https://docs.beautyrouter.com/api/webhooks/ordercreated.md
- `order.updated`: https://docs.beautyrouter.com/api/webhooks/orderupdated.md
- `company.verification_updated`: https://docs.beautyrouter.com/api/webhooks/companyverificationupdated.md
- `product_match.updated`: https://docs.beautyrouter.com/api/webhooks/productmatchupdated.md
