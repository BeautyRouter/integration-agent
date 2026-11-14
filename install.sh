#!/bin/sh
# Copies the Beauty Router agent into a project, for one coding agent. It only copies files from this repository and
# prints how to add the MCP server. It downloads nothing and changes no setting.
#
# Usage: ./install.sh claude|codex|cursor [project folder, default: the current folder]

set -eu

usage() {
  echo "Usage: ./install.sh claude|codex|cursor [project folder]" >&2
  exit 2
}

[ $# -ge 1 ] || usage
project=${2:-.}
plugin=$(cd "$(dirname "$0")" && pwd)/plugin

# Codex reads agents as TOML, which scripts/sync.ts generates from the Markdown agents that Claude Code and Cursor read.
case $1 in
  claude) skills=.claude/skills agents=.claude/agents source=agents extension=md ;;
  codex) skills=.agents/skills agents=.codex/agents source=codex-agents extension=toml ;;
  cursor) skills=.cursor/skills agents=.cursor/agents source=agents extension=md ;;
  *) usage ;;
esac

[ -d "$project" ] || { echo "No such folder: $project" >&2; exit 1; }
mkdir -p "$project/$skills" "$project/$agents"

for skill in "$plugin"/skills/*/; do
  name=$(basename "$skill")
  rm -rf "${project:?}/$skills/$name"
  cp -R "$skill" "$project/$skills/$name"
done
for agent in "$plugin/$source"/*."$extension"; do
  cp "$agent" "$project/$agents/"
done

url=$(sed -n 's/.*"url": *"\([^"]*\)".*/\1/p' "$plugin/mcp.json")

echo "Copied the skills to $project/$skills and the agents to $project/$agents."
echo
echo "Add the Beauty Router MCP server, then sign in to it from your coding agent:"
case $1 in
  claude) echo "  claude mcp add --transport http --scope project beauty-router $url" ;;
  codex) printf '  In ~/.codex/config.toml:\n\n  [mcp_servers.beauty-router]\n  url = "%s"\n' "$url" ;;
  cursor) printf '  In %s/.cursor/mcp.json:\n\n  { "mcpServers": { "beauty-router": { "url": "%s" } } }\n' "$project" "$url" ;;
esac
echo
echo "Then ask your coding agent to integrate Beauty Router into this app."
