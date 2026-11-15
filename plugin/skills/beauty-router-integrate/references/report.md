# The report

## What it holds

- the agent's version, the coding agent, and the mode;
- each step: done or skipped, and why it was skipped;
- each production step: done by you or left to the user, and why it was left; or that production waits for the technical call with Beauty Router;
- the problems from the list you kept: where the docs, a skill, the MCP server, or this agent made you guess, retry, or ask, and what would have prevented it;
- what would make the next run faster.

It holds no code, no file contents, no file paths, no secret, no token, and no personal data such as names or emails of the app's users.

## Asking the user

Show the exact text. Then say, in your own words:

> Sending this report helps Beauty Router fix what this run hit. It is stored with your salon software, so the next time you run this agent, for an update or a new feature, it starts from this report and asks you less.

Send it with `send_report` only after the user says yes. When the user says no, send nothing.

Then thank the user, and name what to try first in production once the production steps left to them are done.
