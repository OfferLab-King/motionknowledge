import {z} from 'zod';
import {sha256Text} from './hash';
import {normalizeWhitespace} from './text';

export const StructuredTableV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  kind: z.literal('table'),
  headers: z.array(z.string()).min(1).max(64),
  rows: z.array(z.array(z.string())).max(500),
  rowProvenance: z.array(z.string().max(512)).max(500),
});

export const StructuredObjectV1 = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  kind: z.literal('object'),
  value: z.record(z.string(), z.unknown()),
  pointerProvenance: z.record(z.string(), z.string().max(512)),
});

export const StructuredDataV1 = z.discriminatedUnion('kind', [StructuredTableV1, StructuredObjectV1]);

export type StructuredData = z.infer<typeof StructuredDataV1>;

const MAX_CELL_LENGTH = 4000;
const MAX_ROWS = 500;

export function parseCsv(bytes: Uint8Array): StructuredData {
  const text = Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row');
  const headers = splitCsvLine(lines[0]!);
  if (headers.length < 1 || headers.length > 64) throw new Error('CSV header count out of bounds');
  const rows = lines.slice(1, 1 + MAX_ROWS).map(splitCsvLine).filter((row) => row.length === headers.length);
  const rowProvenance = rows.map((_, i) => `row:${i + 2}`);
  return StructuredTableV1.parse({
    schemaVersion: 1,
    id: 'structured-csv',
    kind: 'table',
    headers,
    rows: rows.map((row) => row.map((cell) => cell.slice(0, MAX_CELL_LENGTH))),
    rowProvenance,
  });
}

export function parseJson(bytes: Uint8Array, id: string): StructuredData {
  const text = Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, '');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON source');
  }
  if (Array.isArray(value)) {
    const headers = [...new Set(value.flatMap((item) => (item && typeof item === 'object' ? Object.keys(item as object) : [])))].slice(0, 64);
    if (headers.length === 0) throw new Error('JSON array has no usable columns');
    const rows = value.slice(0, MAX_ROWS).map((item) => headers.map((header) => {
      const cell = item && typeof item === 'object' ? (item as Record<string, unknown>)[header] : undefined;
      return cell === undefined ? '' : String(cell).slice(0, MAX_CELL_LENGTH);
    }));
    const rowProvenance = rows.map((_, i) => `json[${i}]`);
    return StructuredTableV1.parse({schemaVersion: 1, id, kind: 'table', headers, rows, rowProvenance});
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const pointerProvenance: Record<string, string> = {};
    for (const key of Object.keys(record)) pointerProvenance[key] = `json.${key}`;
    return StructuredObjectV1.parse({schemaVersion: 1, id, kind: 'object', value: record, pointerProvenance});
  }
  throw new Error('JSON source must be an object or array');
}

export function structuredToText(data: StructuredData): string {
  if (data.kind === 'object') return JSON.stringify(data.value, null, 2);
  const header = data.headers.join('\t');
  const rows = data.rows.map((row) => row.join('\t')).join('\n');
  return normalizeWhitespace(`${header}\n${rows}`);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export {sha256Text};
