#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { parseArgs, parseEnv } from "node:util";
import { listen } from "./relay.js";

const usage = "Usage: br listen --forward-to <a localhost URL> [--dotenv <a file with BEAUTY_ROUTER_APP_TOKEN>]";
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { "forward-to": { type: "string" }, dotenv: { type: "string" } },
});

if (positionals.join(" ") !== "listen" || !values["forward-to"]) fail(usage);

// Reading the token from the file keeps its value out of the shell history and out of a coding agent's context. Only
// this key is read: loading the whole file would apply its other keys to this process, and an app's dev env file can
// hold one such as `NODE_TLS_REJECT_UNAUTHORIZED=0`, which would send the token over an unchecked connection.
if (values.dotenv && !existsSync(values.dotenv)) fail(`No env file at ${values.dotenv}.`);
const token = (values.dotenv ? parseEnv(readFileSync(values.dotenv, "utf8")) : process.env).BEAUTY_ROUTER_APP_TOKEN ?? "";
// The relay is sandbox only, and the token never goes to Beauty Router when it is a live one.
if (!token.startsWith("br-apptoken-sandbox-")) fail("BEAUTY_ROUTER_APP_TOKEN must be a sandbox app token, br-apptoken-sandbox-…");

// Events carry salon data and a valid signature, so they go only to this machine.
const forwardTo = URL.parse(values["forward-to"]);
if (!forwardTo || !["http:", "https:"].includes(forwardTo.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(forwardTo.hostname)) {
  fail("--forward-to must be an http or https URL on localhost, 127.0.0.1, or [::1].");
}

listen({ relayUrl: "wss://api.beautyrouter.com/v1/sandbox/webhook-relay", token, forwardTo });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
