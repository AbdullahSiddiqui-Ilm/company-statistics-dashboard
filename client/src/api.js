export async function fetchStatistics(
  url,
  { signal, timeoutMs = 10000, fetchImpl = fetch } = {},
) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error || "Could not load statistics.");
    return payload;
  } catch (error) {
    if (timedOut)
      throw new Error(
        "Statistics took too long to load. Check that the Express server and database are running, then try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
