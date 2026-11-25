// Runs before `next build`: pages are built from the API's content, so a sleeping API (free hosting)
// would fail the build. Wakes it and waits. Does nothing without PMS_API_URL (mock data).
const base = process.env.PMS_API_URL?.replace(/\/+$/, "");
if (base) {
  const until = Date.now() + 180_000;
  let last = "";
  for (let first = true; ; first = false) {
    try {
      const res = await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) break;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? (e.cause?.code ?? e.name) : String(e);
    }
    if (Date.now() > until) {
      console.error(`The API at ${base} is not ready (${last}). The site is built from its content, so the build stops here.`);
      process.exit(1);
    }
    if (first) console.log(`Waiting for the API at ${base} ...`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("API is ready.");
}
