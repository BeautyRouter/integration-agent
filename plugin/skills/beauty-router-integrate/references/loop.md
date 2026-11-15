# The loop of each step

## 1. Study the patterns

Before each database, API, or interface change, find the closest existing example in the project and follow it:

- the migration tool, its file names, and how a new table or column is written;
- the models and the data layer;
- the route or controller layout, and how input is checked and errors are returned;
- how settings and secrets are read, and which env file holds local values;
- the HTTP client the server already uses;
- the background jobs and the scheduler;
- the component library, the page layout, routing, and translations;
- the tests, and where a test for this kind of code goes.

Write the new code as that example is written, in its folder, with its naming. Name the example in the step summary. Use the libraries the project already has. Ask before you add one it lacks.

## 2. Build

Give `br-builder` the step, the decisions, the skills to read, and the examples to follow. It returns the files it changed and the examples it followed. Read the diff yourself before the tests.

## 3. Test in the browser

Run the app as the scan found, and sign in with the test login. Give `br-tester` the step's checks and these, which run in every step:

- The page loads, and Beauty Router's frame loads in it.
- The console has no Content Security Policy error, no `origin_not_allowed`, and no other error from the new code.
- The step's flow works from start to end, as the user would do it.
- `br-apptoken` appears nowhere in the built frontend or in the mobile app.
- The project's own linters, type checks, and tests pass.

Then read the integration status with `get_integration_status`: missing settings, skipped emails, `origin_not_allowed` refusals, errors, and webhook deliveries. Treat each new item as a failed check.

When a check fails, send `br-builder` the failure and the evidence, then test again. Repeat until every check passes. When the same failure comes back three times, stop and tell the user what you tried.

## 4. Match the design

Follow [design.md](design.md) until the new pages look like the rest of the app.

## 5. Hand over

1. Open the step's page in the user's browser. Open only an `https:` URL on a Beauty Router host or the app's local origin, and check it before you open it. When your coding agent has a browser the user sees, use it. Otherwise open the default browser with the URL in quotes: `open "<url>"` on macOS, `xdg-open "<url>"` on Linux, or `start "" "<url>"` on Windows. Tell the user which test account signs in.
2. List the two to five things to try, from the step in [steps.md](steps.md).
3. Wait for the user.
