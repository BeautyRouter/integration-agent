---
name: beauty-router-companies
description: Collect a salon's company details and run Beauty Router verification. Use for company details, business types, licenses, exemption certificates, document uploads, verification statuses, pendingChanges, services, and the payment card.
---

# Beauty Router: companies

This skill covers the company of a logged-in user: its details, documents, verification, services, and payment card. A company is one salon location or one licensed professional. It is created the first time your server logs in one of its users.

Logging in is in `beauty-router-connect`. The `showVerification` page is in `beauty-router-embed`.

## Rules

### Verification

- Wholesale prices and ordering open only once the company is `prequalified` or `verified`. Any other company gets `company_not_verified` from the API.
- Each login returns the company's `verificationStatus`, so you know what to show the user. A `company.verification_updated` webhook tells your server when the status changes.
- A `prequalified` company can order, and its orders wait until the detailed verification ends. No charge happens until then. When a company is declined, its orders close.
- A repeated submit, or a submit on a `verified` company, changes nothing.
- Beauty Router does not support beauty supply stores yet, so verification for a `store` always fails.
- Show "Powered by Beauty Router" with the logo at https://docs.beautyrouter.com/beauty-router-mark.svg, and a link to https://beautyrouter.com/terms/, on your own verification screens.
- `phone` is required on the company's delivery address.

### Company details

- `PUT /v1/company` accepts a partial update. Send only the fields you change, and fields you leave out stay as they are.
- `businessType` is `null` until the company picks a type. The data a company needs depends on it, so set it first.
- Fields the company has not filled in yet are `null`.
- `ein` has 9 digits. `legalName` and `ein` are not used for `professional`.
- For an `unverified` or `declined` company, a change saves and shows directly in `GET /v1/company`.
- For an `in_review`, `prequalified`, or `verified` company, a change to `legalName`, `ein`, `displayName`, or `businessType` goes to `pendingChanges` until the review. The status stays the same, and `GET /v1/company` returns the current values, plus the new values in `pendingChanges`.
- A company can change its delivery address at any time, in any status. It needs a license in that state only to order.
- The address still saves when the company has no license in that state, and the response has `warnings` with `address_state_without_license`. An order to that address fails until the company has the license. A warning comes only with the call that saved that address.
- A `prequalified` company's license counts as soon as it is uploaded. A `verified` company's license must be reviewed before an order can go to that state, and uploading the license creates the review task.
- `buyingSuspended` is `true` when Beauty Router suspended the company's buying. The company can still read its data and manage its orders, but it cannot place a new order.
- With `canManageCompany: false`, the user can read the company, but requests that change it fail with `user_cannot_manage_company`. It does not affect ordering or the payment card.

### Documents

- Send each document in its own request. The request body is the file itself, not JSON. `Content-Type` is the file's type, and `fileName` is a query parameter.
- The file is a PDF, PNG, JPEG, WebP, GIF, TIFF, HEIC, HEIF, or AVIF file, up to 30 MB. A larger file fails with `file_too_large`, and another file type fails with `file_type_not_supported`.
- Beauty Router reads the details from the document, so you send only the file. Until it has processed the document, fields such as `number`, `state`, and `expirationDate` are `null`.
- `processingStatus` is `pending`, `done`, or `failed`. On `failed`, ask the user for a better file.
- There is no update. To correct a document, delete it and upload it again.
- The same file twice for one company fails with `document_already_uploaded`.
- A document that Beauty Router reviewed can be deleted only while the company is `unverified` or `declined`. Otherwise the request fails with `document_locked`.
- Exemption certificates are optional. Once Beauty Router reviewed a certificate, orders delivered in its state have no sales tax.

### Payment card

- A company needs a payment card before its first order.
- The card is entered only in Beauty Router's interface, with `showVerification(element)` or `showPaymentCards(element)`. The API never takes card details.
- Only cards issued in the US are accepted.
- `GET /v1/company/payment-cards` is read only. Any logged-in user of the company can read it, and it has no paging. `usable` is `false` when the card expired or was disabled.

### Services

- A company can select the services it offers, to personalize the marketplace. It is optional and has no effect on verification.
- The marketplace personalizes by the user's own selection if they have one, and otherwise by the company's. With neither, it shows all products.
- Any logged-in user of the company can change the company's selection and their own, including a user with `canManageCompany: false`.
- `PUT /v1/company/services` replaces the company's selection. A user who has their own selection keeps it when the company's selection changes.
- `PUT /v1/user/services` sets the user's own selection. An empty list means the user has their own empty selection, so the marketplace shows them all products.
- `DELETE /v1/user/services` removes the user's selection, so they follow the company again.

## How to do it

### Use Beauty Router's verification page

This is the easiest path. Call `showVerification(element)` from the JavaScript library. The page collects the company details, the documents, and the payment card, and it submits the company for review. You do not need the endpoints below on this path.

### Build your own screens

1. Read the company with `GET /v1/company`.
2. Save the details with `PUT /v1/company`, with `businessType` first. Each step is saved in Beauty Router, so intermediate steps are kept. A `salon` or `store` needs `displayName`, `legalName`, `ein`, `deliveryAddress`, and at least one business or professional license. A `professional` needs `displayName`, `deliveryAddress`, and at least one professional license.
3. Upload each license. `type` is `business` or `professional`.

   ```bash
   curl -X POST "https://api.beautyrouter.com/v1/company/licenses?type=professional&fileName=cosmetology-license.pdf" \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/pdf" \
     --data-binary @cosmetology-license.pdf
   ```

4. Upload exemption certificates, if any, with `POST /v1/company/exemption-certificates?fileName=resale-certificate.pdf`.
5. Open `showVerification(element)` or `showPaymentCards(element)` for the payment card.
6. Submit with `POST /v1/company/verification`. The response is the company, with `verificationStatus` set to `in_review`.
7. When data is missing, the request fails with `verification_data_missing`, and `missing` lists what to add. Send each item, then submit again.
8. Beauty Router runs the initial check once it has processed the documents. When the check passes, the status becomes `prequalified`, and a `company.verification_updated` webhook follows.

### Collect services

Show Beauty Router's form with `showServiceSelector(element, { level })`, or list the services with `GET /v1/services` and save them with `PUT /v1/company/services`:

```bash
curl -X PUT https://api.beautyrouter.com/v1/company/services \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "serviceIds": ["svc-2Hk8mNq4Lp", "svc-7Tz3bVw9Rc"] }'
```

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Onboarding and verification section. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for exact fields, statuses, and rules. Do not guess them.

- Companies, documents, verification, services, and payment cards: https://docs.beautyrouter.com/companies.md
- Every error code: https://docs.beautyrouter.com/errors.md
- `showVerification`, `showPaymentCards`, and `showServiceSelector`: https://docs.beautyrouter.com/embedded-marketplace.md
- `company.verification_updated`: https://docs.beautyrouter.com/api/webhooks/companyverificationupdated.md
- `GET /v1/company`: https://docs.beautyrouter.com/api/operations/getcompany.md
- `PUT /v1/company`: https://docs.beautyrouter.com/api/operations/updatecompany.md
- Licenses: https://docs.beautyrouter.com/api/operations/createlicense.md, https://docs.beautyrouter.com/api/operations/listlicenses.md, https://docs.beautyrouter.com/api/operations/deletelicense.md
- Exemption certificates: https://docs.beautyrouter.com/api/operations/createexemptioncertificate.md, https://docs.beautyrouter.com/api/operations/listexemptioncertificates.md, https://docs.beautyrouter.com/api/operations/deleteexemptioncertificate.md
- `POST /v1/company/verification`: https://docs.beautyrouter.com/api/operations/submitverification.md
- `GET /v1/company/payment-cards`: https://docs.beautyrouter.com/api/operations/listpaymentcards.md
- Company services: https://docs.beautyrouter.com/api/operations/listservices.md, https://docs.beautyrouter.com/api/operations/getcompanyservices.md, https://docs.beautyrouter.com/api/operations/updatecompanyservices.md
- User services: https://docs.beautyrouter.com/api/operations/getuserservices.md, https://docs.beautyrouter.com/api/operations/updateuserservices.md, https://docs.beautyrouter.com/api/operations/deleteuserservices.md
