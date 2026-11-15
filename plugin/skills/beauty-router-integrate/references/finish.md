# Step 6: finish

## 1. The project's commands

Read the integration status with `get_integration_status`, and fix each open item. Then propose the commands the project runs before a commit: code generation, migrations, lint, type checks, tests, and the build. Take them from the package scripts, the Makefile, the CI config, and the contributing guide. Ask the user whether any other command is needed. Run them all, and fix what fails.

## 2. Commit or pull request

Find how the project takes changes:

- the commit message style, from `git log`;
- the branch names;
- a pull request template, and a contributing guide;
- whether the history has merged pull requests, and whether the default branch looks protected.

Propose the path that matches: commits on the current branch, or a new branch with a pull request. On the user's yes, commit in the project's message style, with no file outside the integration. Commit `.beauty-router/integration.json`, and never an env file. For a pull request, push the branch and open it with the project's tool (`gh` or `glab`) when it is installed, or give the user the link. Its description lists the steps and the decisions.

## 3. Production

After the commit, ask once whether to set up production now. On a no, give the user the steps below as their own list, in the production salon software admin area, and go on to the report.

When the app has no production app yet, because the user says so or the production sign-in finds none, tell the user that production starts with a technical call with Beauty Router, which creates the production app. Give them the steps below as the list for after that call, and finish in the sandbox.

On a yes, run the steps in this order. When the user declines a step or it fails, it is left to the user: tell them what to do in the production admin area, and go on with the next step.

The production secrets go where the app reads its secrets in production. At the first step that needs it, ask the user whether that is a file on the server or a secret store, such as their hosting platform's. When it is a file in the project, check that git ignores it and does not track it before the user writes it.

1. **Sign in.** Ask the user to sign in to the MCP server's production environment with their account in the production admin area. It asks for MFA. When the sign-in fails, every step below is left to the user.
2. **App token and webhook secret.** Ask the user to generate the production app token in the production admin area and put it there as `BEAUTY_ROUTER_APP_TOKEN` themselves, and, when the app has the webhook route, the production webhook secret as `BEAUTY_ROUTER_WEBHOOK_SECRET`. The secret comes before the settings, because Beauty Router saves a webhook URL only once the app has a webhook secret. Wait until they say it is done. When the token is in a file in the project, check that `grep -q '^BEAUTY_ROUTER_APP_TOKEN=br-apptoken-live-' <file>` succeeds. When the webhook secret is left to the user, so is the webhook URL in step 3.
3. **Settings.** With `update_origins`, `update_url_templates`, `update_webhook_url`, and `update_email_settings`, set the production origins, the four URL templates to the production pages, the webhook URL when the app has the route, and the emails' app name, logo, accent color, and card statement name. Production login needs the URL templates. Ask the user for the production origin, and take the rest from the routes you built, the sandbox settings, and the app's theme. Show every value, and write them only after the user's yes.
4. **Design.** Publish the sandbox design to production, as [design.md](design.md#production) says.
5. **Status.** Read the production integration status with `get_integration_status`. Tell the user each open item and what fixes it. Do not call `POST /v1/login` in production.

Keep each step, and whether you did it or left it to the user, for the report.

## 4. Report

Follow [report.md](report.md).
