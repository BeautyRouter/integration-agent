---
name: beauty-router-embed
description: Embed Beauty Router's interface in a salon app with the JavaScript library. Use for BeautyRouter.init, getUserToken, onOrderCreated, any show function such as showMarketplace, showCart, showCheckout, showOrder, or showVerification, origins, Content Security Policy, framing, web views, and the Powered by Beauty Router mark.
---

# Beauty Router: embed

This skill covers the JavaScript library that shows Beauty Router's interface inside your salon app. You decide where each part appears, and Beauty Router runs the catalog, payments, sales tax, and order routing behind it.

Logging in a user is in `beauty-router-connect`. Building your own New order page is in `beauty-router-orders`.

## Rules

### Library

- The library runs on web pages. In a mobile app, open such a page in a web view. Native components are not available yet.
- Load the library from `https://js.beautyrouter.com/v1/beauty-router.js` in both environments. It takes the environment from the user token.
- Only origins registered for your salon app can embed the interface. Add each origin in the salon app admin area. Each one must use HTTPS. In the sandbox you can also add `http://localhost` with a port. Each environment has its own origins.
- A request from an origin that is not registered fails with `origin_not_allowed`. A browser may report this as a CORS error instead.
- Beauty Router's frame sends `frame-ancestors` with your registered origins, and the browser checks every page above the frame. When your salon app runs inside another site's frame, register that site's origin too.

### Content Security Policy

- If your page sends a Content Security Policy, allow `https://js.beautyrouter.com` in `script-src` and `frame-src`.
- Add `https://api.beautyrouter.com` to `connect-src` only when your page calls the API itself, and `https://files.beautyrouter.com` to `img-src` only when your own screens show product images or logos.
- Do not add Stripe, 3-D Secure, or carrier hosts. They load inside Beauty Router's frame, under its own policy.
- The library needs no `'unsafe-inline'` and no `'unsafe-eval'`. With a nonce, put the nonce on the library's `<script>` tag. With `'strict-dynamic'`, the library's other files load through that tag.

### Web views

- Load the page from an HTTPS origin you registered. A page loaded from a local file or an HTML string has no origin you can register, so the frame does not load.
- Turn on JavaScript. On Android, set `javaScriptEnabled`.
- Do not limit the hosts a frame can load, because the card issuer's 3-D Secure page can be on any domain. Apply navigation rules to top-level navigation only: on iOS check `navigationAction.targetFrame?.isMainFrame`, on Android check `request.isForMainFrame()`.
- Links that leave the interface, such as the terms and a carrier's tracking site, open a new window. Open them in the system browser: on iOS from `webView(_:createWebViewWith:for:windowFeatures:)`, on Android with `setSupportMultipleWindows(true)` and `onCreateWindow`.
- The verification page uploads license and exemption certificate files, as PDF, PNG, or JPEG. On iOS, add `NSCameraUsageDescription` to `Info.plist`, because the web view's file picker offers the camera and iOS ends the app without the key. On Android, override `onShowFileChooser` in your `WebChromeClient`, because by default the web view cancels every file request. For the camera on Android, add a `MediaStore.ACTION_IMAGE_CAPTURE` intent to the chooser, and ask for `CAMERA` first when your manifest lists it.
- The interface needs no other device permission.

### Tokens

- The app token stays on your server. Your server logs in the user with `POST /v1/login` and passes the user token to your page.
- `getUserToken` is an async function your page provides. It asks your server for a user token and returns it. Never call `POST /v1/login` from the page.
- The library calls `getUserToken` when it starts and whenever the token expires. It does the same once when a request fails with `invalid_user_token`. When `getUserToken` fails, the library shows a try-again state.
- The user token reaches Beauty Router's frame through `postMessage`. It is never put in a URL. The frame keeps it in memory and uses no cookies, so it works where browsers block third-party cookies.
- A user change needs a page reload, or a second `BeautyRouter.init`, which closes the earlier frames.

### Functions

- The functions belong to the object that `BeautyRouter.init` returns.
- Every `show…` function takes the HTML element first.
- You can call `show…` functions right after `init`. The library queues them until it has the first token.
- Each frame takes the full width of its element and grows to the height of its content, so the page scrolls and the frame does not. Do not give the element a fixed height or `overflow: hidden`.

### Orders from the checkout

- `onOrderCreated(orders)` gets an array of orders, because one checkout creates one order per brand or distributor. Each one has the same shape as an order in the API.
- An order is `placed` when the charge succeeds, and `payment_failed` otherwise. An order from a `prequalified` company is `pending_verification`, with no charge yet. Do not treat every order in the array as paid.
- Your server also receives an `order.created` webhook for each order, so it gets the order even if the user closes the page.

### Payment and account actions

- A payment card is entered only in Beauty Router's interface, with `showVerification` or `showPaymentCards`. The card form runs inside the frame, including 3-D Secure. Only cards issued in the US are accepted.
- A payment that waits for 3-D Secure is finished in `showOrder`. Paying again and choosing another card on a failed order also happen there.
- A `placed` order can no longer change its delivery address. The actions in `showOrder` depend on the order's status.
- Prices and checkout open once the company is `prequalified` or `verified`. The other statuses see the marketplace without wholesale prices, and the cart's checkout button is disabled.
- Beauty Router has no roles, so show Beauty Router's screens only to the users who may see them.
- With `canOrder: false`, the user can view the marketplace and fill a cart, but sees no order button. `showOrder` does not let them change or cancel an order, and `showVerification` and `showPaymentCards` do not let them change the payment card.
- With `canManageCompany: false`, the user sees the company details and documents in `showVerification`, but cannot change them or submit the company for review. The payment card still follows `canOrder`.
- The interface asks each company to accept Beauty Router's terms (https://beautyrouter.com/terms/) on first use.

### Beauty Router mark

- The screens where a user buys, pays, or sends company documents show a small "Powered by Beauty Router" mark, because Beauty Router charges the card and processes the order.
- The mark appears on `showMarketplace`, `showCart`, `showCheckout`, `showOrder`, `showVerification`, and `showPaymentCards`. It also appears on `showProductDetails` with `marketplaceFeatures: true`.
- Show "Powered by Beauty Router" on your own New order and verification screens too, with the logo at https://docs.beautyrouter.com/beauty-router-mark.svg in front of the text, about 16 pixels high, and no link. Link to https://beautyrouter.com/terms/ on those screens.

## How to do it

1. Add your origins in the salon app admin area of each environment.
2. Add a server endpoint, here `/beauty-router/login`, that logs in the current user with `POST /v1/login` and returns the user token.
3. Add the script to your page.

   ```html
   <script src="https://js.beautyrouter.com/v1/beauty-router.js"></script>
   ```

4. Call `BeautyRouter.init`, then call a `show…` function on the object it returns.

   ```js
   const beautyRouter = BeautyRouter.init({
     async getUserToken() {
       const response = await fetch("/beauty-router/login", { method: "POST" });
       const { userToken } = await response.json();
       return userToken;
     },
     onOrderCreated(orders) {},
   });

   beautyRouter.showMarketplace(document.getElementById("beauty-router"));
   ```

5. Build the pages that email links open: `orderUrl`, `productUrl`, `verificationUrl`, and `marketplaceUrl`. See `beauty-router-webhooks`.

### Functions

- `showMarketplace(element)`: the main page of the marketplace.
- `showCart(element)`: the cart, grouped by brand or distributor. It opens the checkout in the same element.
- `showCheckout(element, { lines })`: a checkout for a list of lines, apart from the cart. Use it when your salon app builds the list on its own screen. Each line has `productId`, `quantity`, and an optional `supplierId`. Without a `supplierId`, Beauty Router picks the best offer.
- `showFavorites(element)`: the user's favorite products.
- `showOrders(element)`: order history, with all the company's orders and drafts.
- `showOrder(element, orderId)`: one order, with its actions.
- `showOrderTracking(element, orderId)`: the tracking page of one order.
- `showOrderRating(element, orderId)`: the form to rate one delivered order.
- `showVerification(element)`: company details, documents, and the payment card. It submits the company for review.
- `showPaymentCards(element)`: a small list of the company's payment cards.
- `showSupplier(element, supplierId)`: the profile of one supplier.
- `showServiceSelector(element, { level })`: a form to select services or propose a new one. `level` is `"company"`, the default, or `"user"`. It is optional.
- `showProductDetails(element, productId, options)`: one product. `options` is optional, and `marketplaceFeatures` defaults to `true`. `marketplaceFeatures: true` shows the add-to-cart button, the other marketplace buttons, and recommended products. `marketplaceFeatures: false` shows the product without them, for your own screens, such as an inventory screen.

The product ID comes from the catalog or from a product match.

### Custom design

Beauty Router can create a design for your salon app, and you select it in the salon app admin area. It applies to every embedded interface session, so your code does not change.

## Check against the guidelines

Before you call the work done, read https://docs.beautyrouter.com/guidelines.md and check the integration against its Placement, Speed, Mobile apps, and Trust and brand sections. List each Required item the integration misses as a problem to fix, and each Recommended item it skips, with the screen or file where it belongs.

## Read for details

Read these pages for each function's states and options. Do not guess them.

- The library, every function, the Content Security Policy, web views, mobile app permissions, and an example page: https://docs.beautyrouter.com/embedded-marketplace.md
- Login and `getUserToken`: https://docs.beautyrouter.com/authentication.md
- What each feature offers, embedded or by API: https://docs.beautyrouter.com/features.md
- Order statuses and order actions: https://docs.beautyrouter.com/orders.md
- Verification statuses: https://docs.beautyrouter.com/companies.md
- Origin and token errors: https://docs.beautyrouter.com/errors.md
- The pages that email links open: https://docs.beautyrouter.com/emails.md
