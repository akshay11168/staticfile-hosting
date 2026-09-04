#!/usr/bin/env npx tsx
/**
 * Generate high-resolution SVG and PNG QR codes for every PDF under events/.
 *
 * Usage:
 *   npm run generate-qr
 *   npm run generate-qr -- --event wedding
 *   npm run generate-qr -- --base-url http://127.0.0.1:8080
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS_DIR = path.join(ROOT, "events");
const QR_DIR = path.join(ROOT, "qr");
const DEFAULT_BASE_URL = "https://static-hosting.biradarakshay.com";

/** Print-friendly: high error correction + quiet zone + large modules. */
const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 4,
  width: 1024,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
};

interface PdfEntry {
  event: string;
  doc: string;
  pdfPath: string;
}

function parseArgs(argv: string[]): { baseUrl: string; event?: string } {
  let baseUrl = DEFAULT_BASE_URL;
  let event: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-url") {
      baseUrl = argv[++i] ?? "";
    } else if (arg === "--event") {
      event = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Generate QR codes for PDFs under events/

Options:
  --base-url <url>  Public site origin (default: ${DEFAULT_BASE_URL})
  --event <name>    Only generate for one event folder
`);
      process.exit(0);
    }
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), event };
}

async function listPdfs(eventsDir: string): Promise<PdfEntry[]> {
  const entries: PdfEntry[] = [];

  let eventDirs: string[];
  try {
    eventDirs = await fs.readdir(eventsDir);
  } catch {
    return entries;
  }

  for (const event of eventDirs.sort()) {
    if (event.startsWith(".")) continue;
    const eventPath = path.join(eventsDir, event);
    const stat = await fs.stat(eventPath);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(eventPath);
    for (const file of files.sort()) {
      if (!file.toLowerCase().endsWith(".pdf")) continue;
      entries.push({
        event,
        doc: path.basename(file, ".pdf"),
        pdfPath: path.join(eventPath, file),
      });
    }
  }

  return entries;
}

function stableUrl(baseUrl: string, event: string, doc: string): string {
  return `${baseUrl}/event/${event}/${doc}`;
}

async function writeQr(url: string, svgPath: string, pngPath: string): Promise<void> {
  await fs.mkdir(path.dirname(svgPath), { recursive: true });

  const svg = await QRCode.toString(url, {
    ...QR_OPTIONS,
    type: "svg",
  });
  await fs.writeFile(svgPath, svg, "utf8");

  await QRCode.toFile(pngPath, url, {
    ...QR_OPTIONS,
    type: "png",
  });
}

async function main(): Promise<number> {
  const { baseUrl, event: onlyEvent } = parseArgs(process.argv.slice(2));

  if (!/^https?:\/\//.test(baseUrl)) {
    console.error("--base-url must start with http:// or https://");
    return 2;
  }

  const pdfs = await listPdfs(EVENTS_DIR);
  let generated = 0;

  for (const { event, doc, pdfPath } of pdfs) {
    if (onlyEvent && event !== onlyEvent) continue;

    const url = stableUrl(baseUrl, event, doc);
    const outDir = path.join(QR_DIR, event);
    const svgPath = path.join(outDir, `${doc}.svg`);
    const pngPath = path.join(outDir, `${doc}.png`);

    await writeQr(url, svgPath, pngPath);

    console.log(`${path.relative(ROOT, pdfPath)} -> ${url}`);
    console.log(`  ${path.relative(ROOT, svgPath)}`);
    console.log(`  ${path.relative(ROOT, pngPath)}`);
    generated += 1;
  }

  if (generated === 0) {
    console.error(
      `No PDFs found under events/\n` +
        `Add events/<event-name>/<document>.pdf and re-run.`,
    );
    return 1;
  }

  console.log(`\nGenerated ${generated} QR code pair(s).`);
  return 0;
}

process.exit(await main());
