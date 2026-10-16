/**
 * Cookieless page analytics for the QR generator.
 * Cloudflare records visits. Umami records the events below.
 * The text typed into the page is never sent.
 */

type AnalyticsConfig = {
  beacon?: string;
  umamiId?: string;
  domain?: string;
};

type UmamiTracker = {
  track: (event: string, props?: Record<string, string>) => void;
};

const allowedEvents = new Set(["qr_ready", "qr_download"]);
const allowedKinds = new Set(["png", "svg"]);

function hostAllowsAnalytics(hostname: string): boolean {
  return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]" && !hostname.endsWith(".local");
}

function readConfig(): { beacon: string; umamiId: string; domain: string } {
  const raw = (window as Window & { __analytics?: AnalyticsConfig }).__analytics;
  return {
    beacon: raw?.beacon?.trim() ?? "",
    umamiId: raw?.umamiId?.trim() ?? "",
    domain: raw?.domain?.trim() || window.location.hostname,
  };
}

export function loadAnalytics(): void {
  if (!hostAllowsAnalytics(window.location.hostname)) return;
  const { beacon, umamiId, domain } = readConfig();

  if (beacon) {
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute("data-cf-beacon", JSON.stringify({ token: beacon }));
    document.body.appendChild(script);
  }

  if (umamiId) {
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://cloud.umami.is/script.js";
    script.dataset.websiteId = umamiId;
    script.dataset.domains = domain;
    document.body.appendChild(script);
  }
}

export function track(event: string, kind?: string): void {
  if (!allowedEvents.has(event) || !hostAllowsAnalytics(window.location.hostname)) return;
  const umami = (window as Window & { umami?: UmamiTracker }).umami;
  if (!umami || typeof umami.track !== "function") return;
  const props: Record<string, string> = { path: window.location.pathname };
  if (kind && allowedKinds.has(kind)) props.kind = kind;
  umami.track(event, props);
}
