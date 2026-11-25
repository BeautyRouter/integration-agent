---
name: beauty-router-orders
description: Create and manage Beauty Router orders over the API. Use for a New order page, offers, quotes, POST /v1/orders/batch, Idempotency-Key, expectedTotal, drafts, order statuses, cancel, delivery address changes, tracking, rating, and failed charges.
---

# Beauty Router: orders

This skill covers placing orders over the API from your own New order page, and reading and changing orders. A supplier is a brand or distributor. One checkout creates one order per supplier.

If your users check out in the embedded interface, you need only the order statuses and actions here. See `beauty-router-embed`. Webhook handling is in `beauty-router-webhooks`.

## Rules

### Placing orders

- Send `Idempotency-Key` and `expectedTotal` on `POST /v1/orders/batch`. The key is required. `expectedTotal` is the group's `total` from the quote.
- Send a new `Idempotency-Key` for each order the user places, such as a UUID. When a request times out, send it again with the same key and the same body. Beauty Router returns the first result and does not create the orders twice.
- The same key with a different body fails with `idempotency_key_reused`. A refused request creates nothing and stores no key, so you can repeat it with the same key. `idempotency_key_in_use` means an earlier request is still finishing, so try again shortly. A key belongs to the company and lasts 24 hours.
- A quote is not an object and holds no price. Prices can change until the orders are placed, and `expectedTotal` is how you find out.
- When a group differs from `expectedTotal` by $0.10 or more, the request fails with `409` `order_total_changed`, and nothing is created. Show the new amounts from `quote` to the user, then send the request again with the new totals.
- When any group has a problem, or `companyProblems` lists one, the request fails with `409` `order_has_problems`, and nothing is created. `quote` lists them. Fix each problem or leave that group out.
- Do not place a group with problems.
- Never treat a `null` amount as `0`. An amount Beauty Router cannot work out is `null`, so do not show it as free.
- A failed charge never fails the request. That order comes back as `payment_failed`, and the other orders stand. Read each order's `status` in `data`.
- The charge runs while the user is not present, so a card that needs 3-D Secure fails. Open `showOrder(element, orderId)`, where the user pays with 3-D Secure or chooses another card.
- Wholesale prices reach the API only for `prequalified` or `verified` companies. For any other company, the offers, quote, and order calls fail with `company_not_verified`.
- Placing orders and saving drafts need `canOrder`. A quote with a `deliveryAddress` needs `canOrder` or `canManageCompany`.
- Show "Powered by Beauty Router" with the logo at https://docs.beautyrouter.com/beauty-router-mark.svg, and a link to https://beautyrouter.com/terms/, on your New order page.
- Offers and quote each have a limit per user token, and a request over it fails with `rate_limit_exceeded`.

### After the order

- The statuses are `draft`, `pending_verification`, `payment_failed`, `placed`, `ready_to_ship`, `in_transit`, `delivered`, `delivery_failed`, and `canceled`. On a canceled order, `cancelReason` says why.
- A `prequalified` company's order is `pending_verification`, with no charge. When verification passes, the charge runs, and the order becomes `placed` or `payment_failed`. An order for a brand or distributor that confirms each order itself becomes `placed` with no charge, and waits for that confirmation. When a company is declined, its orders close.
- Some brands and distributors confirm each order themselves. Their order is `placed` with no charge, and the charge runs when they confirm it. The quote's `chargeTiming` is `after_supplier_confirmation` for them.
- `payment_failed` means the card charge failed, or a payment is waiting for 3-D Secure. Beauty Router tries once more after 24 hours when the failure can be retried. If that fails too, or the failure cannot be retried, it cancels the order at 24 hours.
- An order takes stock from the supplier when it is charged. A draft, a `pending_verification` order, a `payment_failed` order, and a `placed` order that waits for the supplier's confirmation hold none, so stock can run out before they are charged.
- Shipping is locked when the order is created. Other amounts can still change, so keep the order up to date from `order.updated`.

### Changing orders

- A `placed` order can no longer change its delivery address. The request fails with `order_action_not_allowed`, because the brand or distributor may already be preparing it.
- Cancel with `POST /v1/orders/{orderId}/cancel`. It works on `pending_verification`, `placed`, and `payment_failed`.
- Change the address with `PUT /v1/orders/{orderId}/delivery-address`. It works on `draft` and `pending_verification`. Send the full address. `phone` is optional, and without it the order uses the company's phone. This changes the order only, not the company's default address. Beauty Router recalculates the sales tax, so `total` can change.
- Delete a draft with `DELETE /v1/orders/{orderId}`. It works on `draft` and returns `204` with no body.
- An order with another status fails with `order_action_not_allowed`. Read the order, and offer only the actions its status allows.
- When the brand's system refuses a cancel, the request fails with `409` `supplier_refused_cancel`, and the order stays `placed`. Tell the user the order could not be canceled.
- A user logged in with `canOrder: false` gets `user_cannot_order`.
- Paying again and choosing another card on an order have no API. Use `showOrder(element, orderId)`. The API never takes card details.

### Drafts

- Send `saveAsDraft: true` to `POST /v1/orders/batch`. `Idempotency-Key` stays required, and `expectedTotal` is not needed. The company must be `prequalified` or `verified`.
- A draft holds no stock, the supplier never sees it, and it sends no webhook, no email, and no notification. `order.created` is sent when the draft is placed.
- Send the draft's ID as `draftOrderId` on the order. With `saveAsDraft: true`, the request updates the draft. With `saveAsDraft: false`, it places the draft, and the order needs `expectedTotal` as usual.
- Values are not merged. An address, a phone number, or a card you leave out falls back to the company's default, not to the draft's value. The lines are replaced, and the supplier cannot change.
- Saved amounts are not refreshed. On a reopened draft, get offers and a quote before you place it.
- With no address, `salesTax`, `shipping`, and `total` are `null`, never `0`.

## How to do it

### Build a New order page

1. Call `POST /v1/products/offers` for the visible rows and the selected rows. Split a longer list into chunks of 500. The first offer of each product has `recommended: true`.
2. Call `POST /v1/orders/quote` on page load, when the address or a supplier changes, and before placing the orders. When the user edits a quantity, estimate the line totals from the offers and keep the last tax.
3. Check `problems` on each group, `unresolvedLines`, and `companyProblems`. Show the `message`, or use the `code` to build your own.
4. Call `GET /v1/company/payment-cards`. When the company has no usable card, open `showPaymentCards(element)` so the user can add one.
5. Call `POST /v1/orders/batch` with one entry per group: its `supplierId`, `lines`, and `expectedTotal`.

   ```bash
   IDEMPOTENCY_KEY="4f0c2b7e-9a1d-4c36-b8e5-2d7a6f1e3c90" # An example value, not a secret. gitleaks:allow
   curl https://api.beautyrouter.com/v1/orders/batch \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
     -d '{
       "orders": [
         {
           "supplierId": "sup-1Ry6tUi3Op",
           "lines": [
             { "productId": "prod-4Fz9QbX2kL", "quantity": 6 },
             { "productId": "prod-6Gh2jKl8Zx", "quantity": 4 }
           ],
           "expectedTotal": 275.01
         }
       ],
       "paymentCardId": "card-6Mn3bVc8Xz"
     }'
   ```

6. The response is `201`, with each order after its charge attempt in `data`: `placed`, `payment_failed`, or `pending_verification`. Your server also receives an `order.created` webhook for each one.
7. Show each `payment_failed` order with `showOrder(element, orderId)`.

### Read and follow orders

- `GET /v1/orders` lists the company's orders, newest first, with paging. It includes drafts, and `status` is an optional filter.
- `GET /v1/orders/{orderId}` returns one order. An order of another company fails with `not_found`.
- For tracking, use `showOrderTracking(element, orderId)`, or `trackingNumbers` on the order. The `url` and the `carrier` are left out when Beauty Router does not have them.
- For rating, use `showOrderRating(element, orderId)` or `showOrder(element, orderId)`. The salon can rate an order once it is delivered. There is no rating API.
- To report a problem with a `delivery_failed` or `canceled` order, the salon uses `showOrder(element, orderId)`.

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Inventory and reorders, Neutrality, and Orders and notifications sections. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for exact fields, statuses, and problem codes. Do not guess them.

- Offers, quotes, order creation, problems, and drafts: https://docs.beautyrouter.com/create-orders.md
- Order fields, statuses, cancel reasons, and order changes: https://docs.beautyrouter.com/orders.md
- Every error code: https://docs.beautyrouter.com/errors.md
- `showOrder` and the checkout: https://docs.beautyrouter.com/embedded-marketplace.md
- Payment cards: https://docs.beautyrouter.com/companies.md
- `POST /v1/products/offers`: https://docs.beautyrouter.com/api/operations/getproductoffers.md
- `POST /v1/orders/quote`: https://docs.beautyrouter.com/api/operations/quoteorders.md
- `POST /v1/orders/batch`: https://docs.beautyrouter.com/api/operations/createorders.md
- `GET /v1/orders`: https://docs.beautyrouter.com/api/operations/listorders.md
- `GET /v1/orders/{orderId}`: https://docs.beautyrouter.com/api/operations/getorder.md
- `POST /v1/orders/{orderId}/cancel`: https://docs.beautyrouter.com/api/operations/cancelorder.md
- `PUT /v1/orders/{orderId}/delivery-address`: https://docs.beautyrouter.com/api/operations/updateorderdeliveryaddress.md
- `DELETE /v1/orders/{orderId}`: https://docs.beautyrouter.com/api/operations/deletedraftorder.md
- `GET /v1/company/payment-cards`: https://docs.beautyrouter.com/api/operations/listpaymentcards.md
