export async function fetchStatistics(
  url,
  { signal, timeoutMs = 10000, fetchImpl = fetch, method = "GET", body } = {},
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
    const response = await fetchImpl(url, { signal: controller.signal, method, credentials: "same-origin", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error || "Could not load statistics.");
    return payload;
  } catch (error) {
    if (timedOut)
      throw new Error(
        "The request took too long. Check that the Express server and database are running, then try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
