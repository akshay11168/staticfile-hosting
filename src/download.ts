/** Browser router: /event/<event>/<doc> → open events/<event>/<doc>.pdf in-browser. */

function parseEventPath(pathname: string): { eventName: string; docName: string } | null {
  const match = pathname.match(/^\/event\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return {
    eventName: decodeURIComponent(match[1]),
    docName: decodeURIComponent(match[2]),
  };
}

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

async function pdfExists(pdfUrl: string): Promise<boolean> {
  try {
    const head = await fetch(pdfUrl, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
  } catch {
    // Some static hosts omit HEAD; fall through to GET.
  }

  try {
    const get = await fetch(pdfUrl, { method: "GET", cache: "no-store" });
    return get.ok;
  } catch {
    return false;
  }
}

function showFallback(statusEl: HTMLElement, fallbackEl: HTMLElement, message: string): void {
  statusEl.textContent = message;
  fallbackEl.classList.remove("hidden");
}

async function main(): Promise<void> {
  const statusEl = requireEl<HTMLElement>("status");
  const fallbackEl = requireEl<HTMLElement>("fallback");
  const linkEl = requireEl<HTMLAnchorElement>("link");

  const parsed = parseEventPath(location.pathname);
  if (!parsed) {
    statusEl.textContent = "Not found.";
    return;
  }

  const { eventName, docName } = parsed;
  const pdfUrl = `/events/${encodeURIComponent(eventName)}/${encodeURIComponent(docName)}.pdf`;
  const fileName = `${docName}.pdf`;

  linkEl.href = pdfUrl;
  linkEl.removeAttribute("download");
  linkEl.textContent = `Open ${fileName}`;

  const exists = await pdfExists(pdfUrl);
  if (!exists) {
    showFallback(statusEl, fallbackEl, "PDF not found. If this is wrong, use:");
    return;
  }

  // Navigate to the PDF so the browser’s built-in viewer displays it.
  window.location.replace(pdfUrl);
}

void main();
