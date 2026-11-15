# Step 0: scan and preview

This step changes no code. It writes only `.beauty-router/integration.json`, at its end.

## Scan

Run `git log -30 --format=%s` and `git branch -a` yourself, and give `br-explorer` the project root and their output. It returns:

- the platforms (web, mobile web views, native mobile, desktop) and the stack of each;
- how to install, run, and sign in locally: the commands, the ports, the services it needs, and the seed users or test accounts it finds;
- how a signed-in user and their salon or location are read on the server, and the roles that exist;
- the main navigation, the settings pages, the onboarding, and where low stock or reorders show;
- the design system: the theme file, CSS variables, the component library, fonts, and the page layout;
- the database, the ORM, the migration tool, the background jobs, and where settings and secrets are read;
- whether the app has products or inventory, and how a product is stored;
- whether the app sends a Content Security Policy, and runs inside another site's frame;
- the commit and pull request habits, from the history and the repository files.

## Test login

Use a seed user or a documented test account when the scan found one. When it found none, ask the user once for a test account of the app. Keep it for this session only, and never write it to a file.

## Sandbox app token

In the same message as the decisions, ask the user to generate the app's sandbox app token in the sandbox admin area. A team cannot register an app in Beauty Router itself: Beauty Router support registers it and invites the team, so a user whose team has no app yet writes to info@beautyrouter.com. The rest of step 0 goes on while they wait.

Name the local env file from the scan, and check that git ignores it and does not track it, as the rules say. Then ask them to add `BEAUTY_ROUTER_APP_TOKEN=<the token>` to that file themselves, which keeps the token out of this conversation. When they paste a sandbox token here anyway, append it to the file with the shell, and never repeat it.

Then check it without reading it: `grep -q '^BEAUTY_ROUTER_APP_TOKEN=br-apptoken-sandbox-' <file>` must succeed. The development env file holds only sandbox values. When `grep -q 'br-apptoken-live-' <file>` succeeds, a live token is in it: tell the user to remove it from the file and revoke it, and go on only after they did. A live token belongs only in the file or secret store the user chooses for production at Finish.

## Decisions

Propose a default for each decision from the scan and from the guidelines at https://docs.beautyrouter.com/guidelines.md. A Required guideline is not a decision: build it.

1. **Marketplace placement.** A top-level item in the main navigation is Required. Propose its label in the app's own words, and its position.
2. **Cart and favorites.** Recommended: their own entries next to the marketplace, or the cart in the header.
3. **Product details from the app's screens.** Whether a product, a supplier, or the cart opens in a drawer over the app's screen, as Recommended, or on its own page.
4. **Verification.** Where it goes in the company or business settings, which is Required. Whether it becomes an onboarding step, and whether a banner shows the status, which are both Recommended.
5. **Who can order, and who manages the company.** Which of the app's roles get `canOrder` and `canManageCompany`. At least one user of each location keeps `canManageCompany`.
6. **Orders in the app's database.** Whether the app keeps its own copy of orders, for its reports, inventory, or notifications. Step 4 adds a webhook endpoint when the app keeps orders or matches products (decision 7).
7. **Products.** When the app has products or inventory:
   - whether to match the products salons already typed in, which is Recommended;
   - whether adding a product picks from the Beauty Router catalog;
   - whether low stock opens a reorder.
8. **Mobile.** Which mobile screens open the marketplace in a web view.

Fast mode shows all of them on one screen, with the defaults, and asks the user to change any. Guided mode asks one at a time, with what each choice changes.

## Preview

1. Read the app's colors, font, and corner radius from its theme.
2. Save them as a sandbox design through the MCP server ([design.md](design.md)).
3. Get a preview link with `create_preview_link`, and open it in the user's browser as [loop.md](loop.md#5-hand-over) says. It shows the real marketplace with a verified demo company and prices, in the app's colors, before any code changes.
4. Ask the user to look at it while you start step 1.
