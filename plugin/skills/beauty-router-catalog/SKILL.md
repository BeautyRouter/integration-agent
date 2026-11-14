---
name: beauty-router-catalog
description: Sync and use the Beauty Router product catalog. Use for catalog files, the full and delta download, catalog search, product details, product matching, matching a salon's typed-in products, suppliers, archiving a supplier, and delivery estimates.
---

# Beauty Router: catalog

This skill covers the product catalog, matching your users' products to it, and the suppliers of a salon location. A supplier is a brand or distributor.

Prices are not here. They come from offers, in `beauty-router-orders`.

## Rules

### Catalog

- `GET /v1/catalog/files` and `GET /v1/catalog/search` take the app token, so call them from your server. `GET /v1/catalog/products/{productId}` takes the user token, so your page can call it.
- The files and the search results have no wholesale prices. Product details and supplier lists have none either. Prices come from `POST /v1/products/offers`.
- The file links are valid for 1 hour. Download the files within that hour, or call the endpoint again for new links.
- The files are gzip-compressed JSON Lines, with one object per line. Beauty Router generates them daily.
- Download the full file first. After that, apply the delta every day. If you miss a day, download the full file again.
- The delta has the products added, changed, or removed in the last 24 hours. A removed product has `removed: true`.
- The catalog has more products than the marketplace sells at any moment, so check `availableInMarketplace` before you offer a product for sale.
- Products in different sizes are separate products, each with its own `id`. They share a `groupId`.
- A non-empty `setMembers` means the product is a set. A set has `brand: null`, because each member has its own brand.
- `GET /v1/catalog/products/{productId}` has no batch form, so use the files for lists.
- In `suppliers` on product details, `productId` is the size that supplier sells, and `id` is the supplier.

### Product matching

- Matches belong to the company of the logged-in user and take the user token. A request for another company's match fails with `not_found`.
- `POST /v1/product-matches` takes up to 500 products per request. `externalId` is unique within the company, and the same `externalId` twice in one request fails with `validation_failed`.
- Sending the same `externalId` again returns the existing match, even if other fields changed. This result is cached forever. To match a changed product again, send it with a new `externalId`.
- A match never ends as "not found". A review ends as `matched` with the product ID, or `needs_reply` with a question. When the product is not in the catalog yet, Beauty Router adds it and returns `matched` with the new product ID.
- Several of your products can match the same catalog product. Send each of them.
- A reply on a match that is not `needs_reply` fails with `reply_not_expected`.
- A product that Beauty Router added for your match reaches the catalog files with the next daily delta.

### Photos in matching

- `images` holds up to 10 photos, as HTTPS URLs that Beauty Router downloads. Photos help identify a product, so send them when you have them.
- Beauty Router caches the result of analyzing a photo by its URL. The cache is global and permanent.
- Never reuse a URL for a totally different picture, even years later, and even for another user or salon location. Beauty Router would use the earlier result without analyzing the new picture.
- Keep the URL when the picture stays the same. Beauty Router then uses the earlier result, which is much faster.

### Suppliers

- The supplier endpoints work for one salon location, the company of the logged-in user, and they take the user token.
- `GET /v1/company/suppliers` returns the suppliers this location has ordered from. With `supplierIds`, it returns those suppliers, whether or not it has ordered from them.
- Send up to 50 IDs in `supplierIds`, separated with commas. There is no separate endpoint for one supplier, so send one ID.
- The salon can still order from a supplier it archived (`archived_by_client`). With `archived_by_supplier`, the salon cannot order from it any more.
- A supplier that is `blocked` was blocked by Beauty Router.
- Archive and restore fail with `user_cannot_order` for a user logged in with `canOrder: false`, and with `not_found` for a supplier the salon location has no link to.
- `rating` is `null` until a supplier has 25 fulfilled orders.
- `deliveryBusinessDays` is an estimate, not a promise. It is the preparation time plus the time in transit, in business days.

## How to do it

### Sync the catalog

1. From your server, call `GET /v1/catalog/files`. It returns `full`, `delta`, and `categories`, each with a `url`.
2. Download `full.url`, unpack it, and load one product per line.
3. Download `categories.url`. `parentId` is `null` for a top category, and `order` sorts the categories that share a parent.
4. Every day, call `GET /v1/catalog/files` again and apply `delta.url`.

### Search and show products

- For search on your own screens, your server calls `GET /v1/catalog/search` with `q`, `limit`, and `startingAfter`. You need no index of your own.
- For one product, your page calls `GET /v1/catalog/products/{productId}`.
- To show the full product without building a screen, call `showProductDetails(element, productId, options)`.

### Match products

1. Send your products to `POST /v1/product-matches`. Each one needs `externalId` and `name`. `barcode`, `brand`, `size`, `details`, and `images` are optional.
2. Read each match in the response. A product with a barcode can come back `matched` right away.
3. Handle the `product_match.updated` webhook. Beauty Router sends it when a match is created as `matched` or changes status.
4. When a match is `needs_reply`, show the `question` to your user and send their answer with `PUT /v1/product-matches/{matchId}`, as `{ "reply": "Jadewell" }`. The match goes back to `in_review`.
5. To find every match that waits for a reply, call `GET /v1/product-matches?status=needs_reply`. The list has paging.
6. When a match is `matched`, keep its `productId`.

### Work with suppliers

1. List them with `GET /v1/company/suppliers`, or show one profile with `showSupplier(element, supplierId)`.
2. Archive with `POST /v1/company/suppliers/{supplierId}/archive`, and restore with `POST /v1/company/suppliers/{supplierId}/restore`. Each call returns the supplier.
3. Estimate delivery with `GET /v1/company/delivery-estimates?supplierIds=sup-1Ry6tUi3Op,sup-8Wq2eRt5Yu`.

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Inventory and reorders section. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for exact fields, statuses, and limits. Do not guess them.

- Catalog files, product fields, and search: https://docs.beautyrouter.com/catalog.md
- Product matching: https://docs.beautyrouter.com/product-matching.md
- Suppliers and delivery estimates: https://docs.beautyrouter.com/suppliers.md
- Every error code: https://docs.beautyrouter.com/errors.md
- `GET /v1/catalog/files`: https://docs.beautyrouter.com/api/operations/getcatalogfiles.md
- `GET /v1/catalog/search`: https://docs.beautyrouter.com/api/operations/searchcatalog.md
- `GET /v1/catalog/products/{productId}`: https://docs.beautyrouter.com/api/operations/getcatalogproduct.md
- `POST /v1/product-matches`: https://docs.beautyrouter.com/api/operations/createproductmatches.md
- `GET /v1/product-matches`: https://docs.beautyrouter.com/api/operations/listproductmatches.md
- `GET /v1/product-matches/{matchId}`: https://docs.beautyrouter.com/api/operations/getproductmatch.md
- `PUT /v1/product-matches/{matchId}`: https://docs.beautyrouter.com/api/operations/replytoproductmatch.md
- `product_match.updated`: https://docs.beautyrouter.com/api/webhooks/productmatchupdated.md
- `GET /v1/company/suppliers`: https://docs.beautyrouter.com/api/operations/listcompanysuppliers.md
- Archive and restore: https://docs.beautyrouter.com/api/operations/archivecompanysupplier.md, https://docs.beautyrouter.com/api/operations/restorecompanysupplier.md
- `GET /v1/company/delivery-estimates`: https://docs.beautyrouter.com/api/operations/getdeliveryestimates.md
