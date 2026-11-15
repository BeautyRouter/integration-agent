# Step 6: finish

## 1. The project's commands

Read the integration status with `get_integration_status`, and fix each open item. Then propose the commands the project runs before a commit: code generation, migrations, lint, type checks, tests, and the build. Take them from the package scripts, the Makefile, the CI config, and the contributing guide. Ask the user whether any other command is needed. Run them all, and fix what fails.

## 2. Commit or pull request

Find how the project takes changes:

- the commit message style, from `git log`;
- the branch names;
- a pull request template, and a contributing guide;
- whether the history has merged pull requests, and whether the default branch looks protected.

Propose the path that matches: commits on the current branch, or a new branch with a pull request. On the user's yes, commit in the project's message style, with no file outside the integration. Commit `.beauty-router/integration.json`, and never the env file. For a pull request, push the branch and open it with the project's tool (`gh` or `glab`) when it is installed, or give the user the link. Its description lists the steps and the decisions.

## 3. Go live

Give the user this list. Each item is theirs, in the production salon app admin area, because the live app token must never pass through you:

- Generate a production app token, and put it in the production secret store.
- Add the production origins.
- Set the four URL templates to the production pages. Production login needs them.
- Set the webhook URL and generate its secret, when the app has the webhook route.
- Set the app's name, logo, accent color, and card statement name for the emails.

Then ask whether to publish the sandbox design to production ([design.md](design.md#production)).

## 4. Report

Follow [report.md](report.md).
