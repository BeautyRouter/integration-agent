# Running and testing on each platform

## Web apps

Run the app as its README, its package scripts, its `docker compose` file, or its Procfile says. Test it with your coding agent's browser. When you have no browser tool, as in a terminal session, ask the user to set up the Playwright MCP server, as the Beauty Router docs describe, or to try each step themselves.

## Mobile web views

The marketplace runs on a web page that the app opens in a web view. Read the Web views part of `beauty-router-embed`, and check each item there:

- The page loads from an HTTPS origin registered for the app, not from a local file or an HTML string.
- JavaScript is on.
- Navigation rules apply to the main frame only.
- New windows, such as the terms and a carrier's tracking page, open in the system browser.
- The mobile app permissions the docs list are in the app.

Build and run the app on a simulator or an emulator, and test the web view there.

## Native, desktop, and other apps

Work out how the project builds and runs: the README, the CI config, and the build files. Use the platform's tools, for example:

- `xcodebuild` and `simctl` for iOS;
- Gradle and `adb` with an emulator for Android;
- Playwright for an Electron app.

When a build or a run fails and the fix is not in the project, stop and ask the user, with the command, the error, and what you tried. Do not change the project's build setup to get past it without the user's yes.
