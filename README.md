# Beauty Router integration agent

An agent that integrates [Beauty Router](https://docs.beautyrouter.com/) into your salon software. It runs in your own coding agent: Claude Code, Codex, or Cursor. It:

1. reads your app and proposes where each part of Beauty Router goes;
2. builds the integration one step at a time: login, the marketplace, verification, orders, and the catalog with product matching;
3. after each step, runs your app, tests the step in a browser, fixes what fails, and matches the new pages to your design;
4. opens each finished step in your browser for you to try before the next one;
5. ends with a commit or a pull request in your project's style, sets up your production app when you say yes, and writes a report you can send to Beauty Router.

It has two modes. **Fast** asks only what it cannot find in your code. **Guided** asks about each choice and explains what it changes.

## What you need

- A sandbox app for your salon software in Beauty Router, and your account in its sandbox admin area. You cannot register an app yourself: Beauty Router support registers it and invites your team. If your team has no app yet, write to info@beautyrouter.com.
- A sandbox app token, which you generate in the sandbox admin area and add to your local env file yourself. When the agent builds the webhook route, it creates the sandbox webhook secret itself.
- For production: the production app for your salon software, and your account in its production admin area. Beauty Router creates the production app after a technical call with your team.
- Your coding agent connected to the Beauty Router MCP server, `https://mcp.beautyrouter.com/mcp`. The agent asks you to sign in to it with your sandbox account, and at the end with your production account, which asks for MFA.
- Node.js 22 or later, for the webhook relay `@beautyrouter/cli`, which the agent runs while it tests orders.

## What it sends to Beauty Router

Your code stays on your machine, and with your coding agent's model provider. The agent never sends code, file contents, or file paths to Beauty Router. The Beauty Router MCP server receives only:

- the settings the agent changes in your sandbox app, such as origins and URL templates;
- the sandbox actions it runs, such as setting a test company's verification status;
- the design it saves for your app's embedded screens, with your app's own font and image files that the design uses;
- at the end, only after you sign in to the production environment and say yes to the values it shows: your production app's origins, URL templates, webhook URL, and email settings, and the same design published to production;
- the report at the end, only after you read it and say yes.

The agent never sees an app token or a production webhook secret. You generate each one in the admin area and put it into your env file or your production secret store yourself. The one exception is the sandbox webhook secret: the agent gets it from the MCP server's `generate_webhook_secret` tool, in the sandbox only, and writes it straight to your git-ignored env file, never into code, a message, or the report. A webhook secret only checks the signature of the events Beauty Router sends, so it cannot call the API. The agent checks only that the key is there, and uses it only by running your app. Each production step you decline, or that fails, is on the list the agent gives you.

## Review it before you run it

The agent reads and changes your code, and runs commands in your project. Read this repository before you install it, at the tag you install, and check it against your company's security policy. Everything it does is in Markdown under `plugin/`: the entry skill in `plugin/skills/beauty-router-integrate/`, and its four subagents in `plugin/agents/`.

## Install

### From a marketplace

Claude Code:

```bash
claude plugin marketplace add BeautyRouter/integration-agent@v0.2.0
```

```bash
claude plugin install beauty-router@beauty-router
```

Codex:

```bash
codex plugin marketplace add BeautyRouter/integration-agent --ref v0.2.0
```

Then install Beauty Router from the Plugins Directory, and restart Codex.

Both commands pin the marketplace to the tag you reviewed. Without a tag, they follow the default branch, and an update brings whatever it holds.

Cursor: install Beauty Router from the Cursor Marketplace, where Cursor reviews each update before it is listed. A team can also import this repository as a team marketplace in the Cursor dashboard, under Plugins & MCPs. That import follows the branch it names, so a team that pins versions imports a fork it updates by hand.

### Manually

Clone this repository at a tag, read it, and run the install script from it:

```bash
git clone --branch v0.2.0 https://github.com/BeautyRouter/integration-agent.git beauty-router-integration-agent
```

```bash
./beauty-router-integration-agent/install.sh claude /path/to/your/project
```

Use `codex` or `cursor` in place of `claude` for those coding agents. The script only copies files into your project's skills and agents folders. It prints how to add the MCP server for your coding agent.

## Use

Open your project in your coding agent and ask it to integrate Beauty Router into the app. In Claude Code and Cursor you can also run `/beauty-router-integrate`, and in Codex `$beauty-router-integrate`.

The agent keeps its decisions and progress in `.beauty-router/integration.json` in your project, and commits it with the integration. A later run, such as an update, starts from it.

## Layout

- `plugin/`: the plugin. All three coding agents install this folder.
  - `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json`: one manifest for each coding agent.
  - `skills/beauty-router-integrate/`: the entry skill and its references.
  - `skills/beauty-router-*`: the six Beauty Router skills, copied from the docs repository.
  - `agents/`: the four subagents, which Claude Code and Cursor read.
  - `codex-agents/`: the same subagents as Codex reads them, generated.
  - `mcp.json`: the MCP server for Codex and Cursor. Claude Code takes it from its manifest.
- `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`, `.agents/plugins/marketplace.json`: this repository as a marketplace for each coding agent.
- `install.sh`: the manual install.
- `cli/`: the webhook relay, published as `@beautyrouter/cli`.
- `scripts/sync.ts`: writes the generated files.

## Change it

Edit the entry skill and the agents in `plugin/`. The skill calls the MCP tools by name. `McpServerTests` in the [API repository](https://github.com/BeautyRouter/api) lists every tool the server offers, so a tool renamed or removed there changes the skill too. The six Beauty Router skills, the logo, and `codex-agents/` are generated, so do not edit them here. The skills' source is `public/skills/` in the [docs repository](https://github.com/BeautyRouter/docs).

After a change, run the sync with Node 22.6 or later, with the docs repository next to this one, or pass its path with `--docs`:

```bash
npm run sync
```

`npm run check` writes nothing, and fails when a generated file is out of date, when the three manifests disagree on the version or the MCP server URL, or when the relay CLI in `cli/` has a type error. Run `npm install --prefix cli` once, and the check before each commit.

To try the plugin in Claude Code without installing it, start Claude Code in your salon software's project with `claude --plugin-dir <this repository>/plugin`. `claude plugin validate ./plugin` and `claude plugin validate .` check the plugin and the marketplace.

## Release

1. After a big change, retest the agent on the six sample apps first, as [Retest after a big agent change](https://github.com/BeautyRouter/docs/blob/main/evals/README.md#retest-after-a-big-agent-change) in the docs repository says. A failure on any app blocks the release.
2. Raise `version` in the three manifests in `plugin/`, and run `npm run check`.
3. Tag the commit as `v<version>`, and push the tag.
4. When the relay changed, raise `version` in `cli/package.json`, publish it from `cli/` with `npm publish`, and raise the pin in `references/steps.md` to the same version.
5. Submit the update to each marketplace: Anthropic's plugin submission form, the OpenAI plugin submission portal, and cursor.com/marketplace/publish. Cursor and OpenAI review each update before it is listed.
