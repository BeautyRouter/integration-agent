# Matching the app's design

Beauty Router's screens run in a frame, so the app's CSS does not reach them. Two things change how they look:

- **The app's own page around the frame:** the page title, the spacing, the background, the breadcrumbs, and the drawer. This is code in the project.
- **The design in Beauty Router:** the SDK's design keys (colors, font, and corner radius), and a stylesheet when the keys are not enough. You save it through the MCP server as a new version, and publish that version to the sandbox. The frame loads the published version on its next start, with no code change.

## The design keys

1. Read the app's theme: its CSS variables, its theme file or Tailwind config, or the colors and fonts its components use.
2. Map each value to the design key with the same role. `list_design_keys` lists the keys and the formats they take. Primary is the app's main action color, text is its body text, and background is its page background.
3. Save the design with `save_design`, and publish that version to the sandbox with `publish_design`. The version goes in `.beauty-router/integration.json`.

## The comparison loop

1. Open an app page next to the step's page. Give `br-design-reviewer` both URLs and the test login.
2. It returns each difference, such as spacing, font size, button shape, colors, the header, or the empty and loading states, with the fix it proposes. Each fix is in the host page's code or in the design.
3. Make the fixes: host page fixes through `br-builder`, and design fixes as a new version that you publish to the sandbox.
4. Reload the frame, and compare again. Stop when `br-design-reviewer` finds no difference a user would notice. When the same difference comes back three times, stop and tell the user what is left.

## The stylesheet

Use one only when a difference cannot be fixed with the keys. The rules, which Beauty Router checks on upload:

- It targets the frame's `br-` classes.
- No `@import`.
- `url()` only to font and image files you upload: `create_design_file_upload` gives each file an upload URL and the URL to use in `url()`. Upload the file with `curl --upload-file`, and never read it into the conversation.
- It stays under the size limit.

When an upload is refused, the response says which rule broke and why. Fix the file. Do not work around the rule.

Never hide, cover, or shrink the "Powered by Beauty Router" mark, the terms link, prices, totals, or any control. Beauty Router reviews every production design and reverts one that does.

## Production

The design stays in the sandbox until Finish. There, with the user's yes, ask the user to sign in to the MCP server's production environment, and publish the same sandbox version to production with `publish_design`. Tell the user that it applies at once, and that Beauty Router reviews it within 24 hours and may change or revert it, with an email to the team.
