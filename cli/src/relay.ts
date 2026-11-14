// The relay protocol, which the API's `/v1/sandbox/webhook-relay` endpoint implements (`docs/plan/ai-agent.md`, Webhook
// relay). Each message from Beauty Router is one copy of a sandbox event, with the exact body and headers it signed.
type RelayEvent = { id: string; eventType: string; headers: Record<string, string>; body: string };

type Options = { relayUrl: string; token: string; forwardTo: URL };

export function listen(options: Options) {
  const socket = new WebSocket(options.relayUrl, { headers: { Authorization: `Bearer ${options.token}` } });

  socket.onopen = () => console.log(`Forwarding the app's sandbox events to ${options.forwardTo.href}`);

  socket.onmessage = async (message) => {
    const event = JSON.parse(String(message.data)) as RelayEvent;
    const status = await forward(options.forwardTo, event).catch((error: Error) => error.message);
    console.log(`${event.eventType} ${event.id}: ${status}`);
    // A copy gets one attempt, so the result only feeds the integration status.
    socket.send(JSON.stringify({ id: event.id, status: typeof status === "number" ? status : null }));
  };

  socket.onclose = (close) => {
    // Beauty Router closes with a 4000 to 4999 code when it refuses the connection, such as `invalid_app_token`, and
    // connecting again would be refused the same way.
    if (close.code >= 4000 && close.code <= 4999) {
      console.error(`Beauty Router refused the relay: ${close.reason}`);
      process.exit(1);
    }
    console.error("Disconnected from Beauty Router. Connecting again in 5 seconds.");
    setTimeout(() => listen(options), 5000);
  };
}

async function forward(url: URL, event: RelayEvent) {
  // The body goes as the same text, so the route's signature check runs on the bytes Beauty Router signed.
  const response = await fetch(url, {
    method: "POST",
    headers: event.headers,
    body: event.body,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}
