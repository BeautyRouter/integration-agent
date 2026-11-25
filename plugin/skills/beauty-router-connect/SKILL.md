---
name: beauty-router-connect
description: Connect salon software to the Beauty Router API. Use for app tokens, br secrets create, user tokens, POST /v1/login, logout, sandbox and production, salon software admin setup, allowed IPs, firewall hosts, token rotation, error handling, IDs, money, timestamps, paging, partial updates, and a review of a whole integration against the Beauty Router implementation guidelines.
---

# Beauty Router: connect

This skill covers what every Beauty Router integration needs: tokens, login, environments, setup, errors, and the API conventions. Salon software is the software you connect. Each salon location is its own company in Beauty Router.

For the other parts, use `beauty-router-embed`, `beauty-router-orders`, `beauty-router-companies`, `beauty-router-catalog`, and `beauty-router-webhooks`.

## Rules

### Tokens

- The app token stays on your server. Never put it in browser or mobile code, and never let it leave your security perimeter. Anyone who has it can log in as any user of your salon software and place orders for any company in your client base that has already added a payment card.
- Take the user and the salon location for `POST /v1/login` from your own session, never from what the browser sends, because the app token can log in any user.
- The user token can go to your frontend. It acts for one user only and lasts 24 hours.
- Both environments use one API base URL, `https://api.beautyrouter.com/v1`. The token decides the environment: a sandbox token works in the sandbox, and a live token in production.
- Each token starts with its type and its environment: `br-apptoken-live-`, `br-apptoken-sandbox-`, `br-usertoken-live-`, or `br-usertoken-sandbox-`.
- `POST /v1/login`, `GET /v1/catalog/files`, and `GET /v1/catalog/search` take the app token. Every other endpoint takes the user token, including `GET /v1/catalog/products/{productId}`.
- Send either token as `Authorization: Bearer <token>`.
- The admin area shows each app token once, so store it on your server right away. `br secrets create` writes a new token only to a git-ignored env file or to a secret store's command, and never prints it.
- There is no refresh token. When a request returns `401` with `user_token_expired` or `invalid_user_token`, call `POST /v1/login` again and repeat the request.

### Login

- `POST /v1/login` registers new companies and users, and logs in existing ones. There is no separate registration step, no password, and no email confirmation.
- Send the salon location's ID as `externalSalonLocationId`. A salon with three locations is three companies, and each one is verified and orders on its own.
- A user is the combination of the salon location and `externalUserId`. A person who works at two locations is two users.
- Send only an email the user has verified. If emails must be unique inside a company, check that yourself.
- Every login sends `canOrder` and `canManageCompany`, including when the token expires. A login without either fails with `validation_failed`. Each login sets both, so the latest value wins.
- Keep `canManageCompany` `true` for at least one user of each company. Only those users get the company emails.
- Beauty Router has no roles. Your salon software decides who gets which value.
- A login fails with status `400` and `field` set to `email` when the address cannot receive mail: `email_invalid_format`, `email_domain_not_found`, or `email_mailbox_not_found`. Ask the user to check the email or to give another one.
- A login can succeed with a `warnings` list: `email_mailbox_full` or `email_temporary_address`. If your salon software accepts such an address, it must handle users who do not receive the emails they expect. A warning comes only with the login that checked the email.
- In the sandbox, addresses at `example.com` skip the email check.

### Errors

- Match on `code`, never on `message`. `message` can change.
- `not_found` also covers an object of another company, so check that the user token belongs to the right company.
- `rate_limit_exceeded`: wait a moment and try again, with a longer wait after each failure.
- `internal_error`: try again later. If it keeps happening, send the request ID from the salon software admin area to dev@beautyrouter.com.
- `ip_not_allowed`: the token stays active. Add the address or its range in the admin area, or send the request from an allowed server.
- `origin_not_allowed`: add the origin in the admin area of this environment. A browser may report this as a CORS error instead.
- `company_blocked`: write to dev@beautyrouter.com.
- A warning comes in a `warnings` list on a successful response. Nothing failed, so the request does not need repeating.

### Conventions

- Request and response bodies are JSON, so send `Content-Type: application/json`. The one exception is document uploads, where the body is the file itself.
- Every Beauty Router ID is `{prefix}-{base62}`, such as `prod-4Fz9QbX2kL`. Treat IDs as opaque strings. Do not parse them or assume their length.
- Your own IDs (`externalSalonLocationId`, `externalUserId`, `externalId`) are any string up to 128 characters.
- Timestamps are ISO 8601 in UTC, such as `2026-10-28T19:03:55Z`. A timestamp with a time zone fails with `validation_failed`. Dates without a time look like `2027-06-30`.
- Amounts are decimal numbers in dollars, with a `currency` field next to them. The currency is always `"usd"`. An amount with more than two decimal places fails with `validation_failed`.
- Never treat a `null` amount as `0`. An amount Beauty Router cannot work out is `null`, so do not show it as free.
- The API does not use `PATCH`. An endpoint accepts a partial update only when its documentation says so, as `PUT /v1/company` does. Every other `PUT` endpoint takes the full value.
- If your servers can reach only listed hosts, allow `api.beautyrouter.com` for the API and `files.beautyrouter.com` for catalog files, product images, and logos, over HTTPS on port 443.
- Only some endpoints support paging, and each endpoint's documentation says whether it does. Those use `limit` (default 50, maximum 200) and `startingAfter` (the ID of the last item on the previous page). A paged list returns `data` and `hasMore`.

## How to do it

### Set up

1. There is no self-serve app registration, and a team gets no access before a call with the Beauty Router team, which checks every team first. A team with no app books a call at https://beautyrouter.com/contacts/#schedule or writes to info@beautyrouter.com. After the call, Beauty Router support registers the sandbox app and invites the team to the sandbox admin area.
2. Build and test against the sandbox. Each environment has its own admin area, with its own app tokens, origins, and settings.
3. Generate an app token in the admin area, or create it with `br secrets create --env sandbox --app-token dotenv:<a git-ignored env file>`. Add at least one origin, and set your app's name and all four URL templates: `orderUrl`, `productUrl`, `verificationUrl`, and `marketplaceUrl`.
4. Login needs the required settings of its environment, as Get access in https://docs.beautyrouter.com/support.md lists. Until they are set, login fails with `app_setup_incomplete`, and `missing` lists what to set.
5. Whether you need a webhook URL and secret is in Your webhook URL in https://docs.beautyrouter.com/webhooks.md. See `beauty-router-webhooks`.
6. To test in the sandbox, use the sandbox shortcuts (set a company's verification status, add a test card, send a webhook event, list the sandbox emails) and the webhook relay `br listen`. Both are on the support page.

### Log in a user

Whenever a user needs Beauty Router, your server makes this call, and your code has one path for new and returning users.

```bash
curl https://api.beautyrouter.com/v1/login \
  -H "Authorization: Bearer $BEAUTY_ROUTER_APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalSalonLocationId": "location-2048",
    "externalUserId": "staff-7731",
    "firstName": "Clara",
    "lastName": "Whitfield",
    "email": "clara.whitfield@example.com",
    "canOrder": true,
    "canManageCompany": true
  }'
```

The response has `userToken`, `expiresAt`, `company.id`, `company.verificationStatus`, and `user.id`. Use `company.verificationStatus` to decide what to show the user. Each login returns a new token, and the earlier ones keep working.

### Log out a user

Call `POST /v1/logout` with the user token, from your frontend or your server, when the user logs out of your salon software. The response is `204` with no body. The user's other tokens keep working.

### Limit where app tokens work

Add IP addresses or ranges in the admin area. The list is empty by default, which allows every address, and each environment has its own list. Your servers need fixed outgoing addresses for this.

### Rotate an app token

1. Generate a new token in the admin area, with a lifetime that fits your rotation.
2. Put the new token on your server.
3. Limit the lifetime of the old token, so that it expires once all your servers use the new one.

User tokens stay valid when the app token that created them expires. If a token leaks, revoke it in the admin area. It stops working at once, and so does every user token it created.

### Go live

Beauty Router creates your production app later and invites your team to the production admin area. Set up your salon software in the production admin area, and switch the app token and the webhook secret to production. The API base URL stays the same. Repeat the sandbox setup there, because a change in the sandbox does not reach production.

### Find integration errors

The admin area lists the errors of the last 30 days, and each error links to its section in the errors page. Add a developer email, a Slack webhook, or both to get notified.

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Users and access, Trust and brand, and Launch and upkeep sections. To review a whole integration, check every section. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for exact fields, codes, and steps. Do not guess them.

- Tokens, login, and environments: https://docs.beautyrouter.com/authentication.md
- IDs, money, timestamps, paging, and error shape: https://docs.beautyrouter.com/conventions.md
- Every error code and how to fix it: https://docs.beautyrouter.com/errors.md
- Admin area setup, sandbox tools, and integration errors: https://docs.beautyrouter.com/support.md
- The integration agent and the MCP server: https://docs.beautyrouter.com/ai-agent.md
- The steps of an integration: https://docs.beautyrouter.com/how-it-works.md
- What each feature offers, embedded or by API: https://docs.beautyrouter.com/features.md
- `POST /v1/login`: https://docs.beautyrouter.com/api/operations/login.md
- `POST /v1/logout`: https://docs.beautyrouter.com/api/operations/logout.md
- The full API: https://docs.beautyrouter.com/openapi.yaml
