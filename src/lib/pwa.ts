/**
 * Single guarded service-worker registration.
 * Never registers in dev, inside an iframe, or in Lovable previews.
 */
const SW_URL = "/sw.js";

function blockedHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith(SW_URL))
      .map((registration) => registration.unregister()),
  );
}

export async function registerAppServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const killSwitch = new URL(window.location.href).searchParams.get("sw") === "off";
  const refused =
    !import.meta.env.PROD || inIframe || killSwitch || blockedHost(window.location.hostname);

  if (refused) {
    await unregisterExisting();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    /* offline shell is optional */
  }
}
