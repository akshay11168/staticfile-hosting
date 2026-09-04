#!/usr/bin/env npx tsx
/** Create tiny placeholder PDFs for local demos and structure checks. */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function minimalPdf(label: string): Buffer {
  const safe = [...label]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code < 127 ? ch : "-";
    })
    .join("")
    .slice(0, 40);

  const stream = `BT /F1 24 Tf 72 720 Td (${safe}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];

  for (const obj of objects) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(obj, "ascii"));
  }

  const body = Buffer.concat(chunks);
  const xrefStart = body.length;
  const xrefLines = [`xref\n0 ${offsets.length}\n`, "0000000000 65535 f \n"];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  const trailer =
    `trailer<< /Size ${offsets.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.concat([
    body,
    Buffer.from(xrefLines.join(""), "ascii"),
    Buffer.from(trailer, "ascii"),
  ]);
}

async function main(): Promise<void> {
  const samples: Record<string, string[]> = {
    wedding: ["1", "2", "3", "4", "5", "6"],
    "conference-2026": ["1", "2", "3"],
  };

  for (const [event, docs] of Object.entries(samples)) {
    const folder = path.join(ROOT, "events", event);
    await fs.mkdir(folder, { recursive: true });
    for (const doc of docs) {
      const filePath = path.join(folder, `${doc}.pdf`);
      await fs.writeFile(filePath, minimalPdf(`${event}/${doc}`));
      console.log(path.relative(ROOT, filePath));
    }
  }
}

await main();
