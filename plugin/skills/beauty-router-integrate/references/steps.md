# Steps 1 to 5

Each step reads the skills it names first, and takes the exact fields from the docs pages those skills link to. This page says what the step builds, what it sets through the MCP server, and what the user tries at the end. Each step ends with the guideline sections it names, from https://docs.beautyrouter.com/guidelines.md: build every Required item, and list each Recommended item you skip with the reason.

## 1. Connect

Read `beauty-router-connect` and the Library and Tokens parts of `beauty-router-embed`.

Build:

- A server route that logs in the signed-in user with `POST /v1/login`. It takes the user and the salon location from the app's own session, never from the request.
- `canOrder` and `canManageCompany` from the roles decision, sent on every login.
- The page's `getUserToken`, which calls that route.
- `BeautyRouter.init` once when the app loads, and the user token fetched as soon as the app opens, as the Speed guidelines say.
- Logout: `POST /v1/logout` when the user signs out, and no login for a user the app removed.
- The Content Security Policy entries, when the app sends one.

The server reads the sandbox app token from `BEAUTY_ROUTER_APP_TOKEN`, which the user added in step 0, in the way the app reads its other secrets.

Through the MCP server: add the app's local origin, such as `http://localhost:3000`, with `update_origins`.

Check that a login with the test user returns a user token, and that a request that names another user is refused.

Guidelines: Users and access, Speed.

## 2. Shop

Read `beauty-router-embed`.

Build:

- The marketplace page, with `showMarketplace` in an element that has the full width of the content area, no fixed height, and no `overflow: hidden`.
- Its top-level navigation entry, and the cart and favorites entries from the decisions.
- The drawers from the decisions.

Through the MCP server:

- Set `marketplaceUrl` to the marketplace page with `update_url_templates`.
- Set the test user's company to `prequalified` with `set_company_verification_status`, so prices show.
- Add a test card to the company with `add_test_card`.

The user tries: open the marketplace from the navigation, search, open a product, add it to the cart, and open the cart.

Guidelines: Placement, Speed, Trust and brand.

## 3. Verification

Read `beauty-router-companies`, and `showVerification` in `beauty-router-embed`.

Build:

- `showVerification` in the company or business settings, and on the page that `verificationUrl` opens.
- The status banner and the onboarding step from the decisions. The marketplace stays open for an unverified company.
- The company details the app already has, sent with `PUT /v1/company`, so the user does not type them twice.
- `showServiceSelector` with the salon's own services, when the app has a service menu.

Through the MCP server:

- Set `verificationUrl` with `update_url_templates`.
- Set the test company to `unverified`, `in_review`, `declined`, and back to `prequalified` with `set_company_verification_status`, and check the banner and the page in each status.

The user tries: open verification from the settings, and see the banner.

Guidelines: Onboarding and verification.

## 4. Orders

Read `beauty-router-orders` and `beauty-router-webhooks`.

Build:

- `onOrderCreated`: a confirmation, and a refresh of what the app shows. An order in the array is not always paid, so read each status.
- The order history entry with `showOrders`, and the order page that `orderUrl` opens, with `showOrder`.
- When the app keeps its own copy of orders or matches products: the webhook route, which reads the raw body, checks the signature, responds `2xx` at once, skips an event it already handled, and keeps the newer `updatedAt`. Store the orders in the app's database, as the app stores its other records.
- Questions about an order, a payment, a refund, or a delivery go to Beauty Router's order support, not to the app's support.

Through the MCP server: set `orderUrl`.

- Set `orderUrl` with `update_url_templates`.
- When the app has the webhook route, ask the user to generate a sandbox webhook secret in the sandbox admin area and add `BEAUTY_ROUTER_WEBHOOK_SECRET=<the secret>` to the ignored env file themselves. Check it with `grep -q '^BEAUTY_ROUTER_WEBHOOK_SECRET=' <the env file>`.

Run the webhook relay in the background while you test, so the local route gets the events. Use this exact package and version, with the ignored env file, and the app's own local origin and route:

```bash
npx @beautyrouter/cli@0.1.0 listen --dotenv <the env file> --forward-to <the app's local origin>/<the webhook route>
```

It reads the sandbox app token from the file itself, so you never see it, and prints one line for each event with the route's response status.

Check:

- an order from the checkout reaches `onOrderCreated`;
- the relay delivers `order.created` and the signature check passes;
- a status change you trigger with `trigger_event` reaches the app;
- the order email in `list_sandbox_emails` opens the app's order page.

The user tries: place an order with the test card, see it in the app, and open it.

Guidelines: Orders and notifications.

## 5. Catalog and matching

Only when the app has products or inventory. Read `beauty-router-catalog`.

Build, from the decisions:

- **Matching:** send the app's products to `POST /v1/product-matches`, and keep the match in the app's database, next to the product, as the app stores its other relations. Use an `externalId` that changes when the product changes, because the same `externalId` returns the first result forever. Show `needs_reply` questions to the user who can answer them. Read results from `product_match.updated`, which is why matching needs the webhook route from step 4.
- **Product details:** on a matched product, `showProductDetails` with `marketplaceFeatures: false` in the app's own product screen, with a buy action.
- **Reorder:** from low stock, `showCheckout` with the matched lines. On a delivered order, an order-again action.
- **Catalog picker:** when a salon adds a product, search the catalog through the app's server, because search takes the app token. The route requires the signed-in session, like every route that spends the app token.
- **Catalog sync:** only when the app lists catalog products itself. Download the full file, then the daily delta, in a job like the app's other jobs.

Through the MCP server: set `productUrl` with `update_url_templates`.

The user tries: open a matched product, and reorder from low stock.

Guidelines: Inventory and reorders.
