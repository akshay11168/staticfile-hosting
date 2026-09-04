/** Browser download router for /event/<event>/<doc> → events/<event>/<doc>.pdf */

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

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

function openPdf(pdfUrl: string): void {
  window.location.replace(pdfUrl);
}

function forceDownload(
  blob: Blob,
  fileName: string,
  statusEl: HTMLElement,
  fallbackEl: HTMLElement,
): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  showFallback(statusEl, fallbackEl, "Download started. If nothing happened:");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
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
  linkEl.download = fileName;
  linkEl.textContent = `Tap to open ${fileName}`;

  // iOS Safari blocks most programmatic downloads; open the PDF directly.
  if (isIos()) {
    const exists = await pdfExists(pdfUrl);
    if (exists) {
      openPdf(pdfUrl);
      return;
    }
    showFallback(statusEl, fallbackEl, "PDF not found. If this is wrong, use:");
    return;
  }

  try {
    const res = await fetch(pdfUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("missing");
    const blob = await res.blob();
    forceDownload(blob, fileName, statusEl, fallbackEl);
  } catch {
    showFallback(statusEl, fallbackEl, "Could not auto-download. Open the PDF:");
    window.setTimeout(() => openPdf(pdfUrl), 1000);
  }
}

void main();
