/**
 * Browser QR generator for the site root.
 * Bundled to assets/qr.js. Encoding stays in the page; nothing is uploaded.
 */

import QRCode from "qrcode";

const TEXT_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 4,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
};

const textEl = requireEl<HTMLTextAreaElement>("text");
const canvas = requireEl<HTMLCanvasElement>("qr");
const preview = requireEl<HTMLElement>("preview");
const message = requireEl<HTMLElement>("message");
const pngBtn = requireEl<HTMLButtonElement>("png");
const svgBtn = requireEl<HTMLButtonElement>("svg");

let svgMarkup = "";
let encodedText = "";
let pending: Promise<void> = Promise.resolve();

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function explain(error: unknown): string {
  const detail = error instanceof Error ? error.message : "";
  if (/too big/i.test(detail)) return "That text is too long to fit in a QR code.";
  return "That text could not be turned into a QR code.";
}

function setReady(ready: boolean): void {
  preview.hidden = !ready;
  pngBtn.disabled = !ready;
  svgBtn.disabled = !ready;
}

function clearCode(): void {
  svgMarkup = "";
  encodedText = "";
  setReady(false);
}

function rememberText(value: string): void {
  const hash = value.length > 0 ? `#${encodeURIComponent(value)}` : "";
  const next = `${location.pathname}${location.search}${hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (current === next) return;
  history.replaceState(null, "", next);
}

function readHash(): string {
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function setMessage(text: string, kind?: "hint" | "error"): void {
  message.textContent = text;
  if (kind) message.dataset.kind = kind;
  else delete message.dataset.kind;
}

function saveFile(filename: string, href: string, revoke?: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 1000);
}

async function draw(value: string): Promise<void> {
  if (textEl.value !== value) return;

  if (value.length === 0) {
    clearCode();
    setMessage("Enter text to generate a code.", "hint");
    return;
  }

  try {
    const svg = await QRCode.toString(value, { ...TEXT_OPTIONS, type: "svg" });
    if (textEl.value !== value) return;
    await QRCode.toCanvas(canvas, value, { ...TEXT_OPTIONS, width: 280 });
    if (textEl.value !== value) return;
    svgMarkup = svg;
    encodedText = value;
    setReady(true);
    setMessage("");
  } catch (error) {
    if (textEl.value !== value) return;
    clearCode();
    setMessage(explain(error), "error");
  }
}

function schedule(): void {
  const value = textEl.value;
  rememberText(value);
  pending = pending.then(() => draw(value)).catch(() => undefined);
}

textEl.addEventListener("input", schedule);

pngBtn.addEventListener("click", () => {
  const value = encodedText;
  if (!value) return;
  void QRCode.toDataURL(value, { ...TEXT_OPTIONS, width: 1024 }).then((url) => {
    if (encodedText !== value) return;
    saveFile("qr.png", url);
  });
});

svgBtn.addEventListener("click", () => {
  if (!svgMarkup) return;
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  saveFile("qr.svg", url, url);
});

const initial = readHash();
if (initial) textEl.value = initial;
schedule();
