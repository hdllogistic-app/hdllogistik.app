import { Prisma } from '@/generated/prisma/client';

export interface JakartaDateInfo {
  datePrefix: string; // e.g. "HDL260830"
  businessDate: Date; // Normalized business date object for @db.Date
}

/**
 * Computes the Asia/Jakarta operational date prefix (HDL + YYMMDD) and normalized business date.
 * Ensures that resi prefix matches local Jakarta business date regardless of server UTC offset.
 */
export function getJakartaDateInfo(inputDate: Date = new Date()): JakartaDateInfo {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(inputDate);
  const month = parts.find((p) => p.type === 'month')?.value.padStart(2, '0') || '01';
  const day = parts.find((p) => p.type === 'day')?.value.padStart(2, '0') || '01';
  const year = parts.find((p) => p.type === 'year')?.value.padStart(2, '0') || '26';

  const datePrefix = `HDL${year}${month}${day}`;

  // Get full YYYY-MM-DD for business date @db.Date
  const fullYearFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  const fullParts = fullYearFormatter.formatToParts(inputDate);
  const fullYear = fullParts.find((p) => p.type === 'year')?.value || '2026';
  const fullMonth = fullParts.find((p) => p.type === 'month')?.value.padStart(2, '0') || '01';
  const fullDay = fullParts.find((p) => p.type === 'day')?.value.padStart(2, '0') || '01';

  const businessDate = new Date(`${fullYear}-${fullMonth}-${fullDay}T00:00:00.000Z`);

  return {
    datePrefix,
    businessDate,
  };
}

/**
 * Concurrency-safe helper to query highest sequence and generate next resi number.
 * Enforces strict pattern matching (HDL + YYMMDD + 4 digits).
 * Must be executed inside a Prisma transaction block.
 */
export async function generateNextResiNumber(
  tx: Prisma.TransactionClient,
  datePrefix: string
): Promise<string> {
  const manifests = await tx.manifest.findMany({
    where: {
      resiNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      resiNumber: 'desc',
    },
    take: 10,
    select: {
      resiNumber: true,
    },
  });

  let nextSequence = 1;
  const resiRegex = new RegExp(`^${datePrefix}(\\d{4})$`);

  for (const m of manifests) {
    const match = resiRegex.exec(m.resiNumber);
    if (match && match[1]) {
      const parsedSequence = parseInt(match[1], 10);
      if (!isNaN(parsedSequence)) {
        nextSequence = parsedSequence + 1;
        break;
      }
    }
  }

  if (nextSequence > 9999) {
    throw new Error('Batas maksimum 9999 resi harian untuk tanggal ini telah tercapai.');
  }

  const sequenceSuffix = String(nextSequence).padStart(4, '0');
  return `${datePrefix}${sequenceSuffix}`;
}
