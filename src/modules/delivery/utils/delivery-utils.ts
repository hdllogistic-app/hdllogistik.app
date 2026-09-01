export function normalizeIndonesianPhone(phone?: string | null): string | null {
  if (!phone || !phone.trim()) return null;

  let cleaned = phone.replace(/[^0-9+]/g, '').trim();
  if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }

  if (cleaned.length < 9 || cleaned.length > 15 || !/^\d+$/.test(cleaned)) {
    return null; // Invalid phone number length or non-digit
  }

  return cleaned;
}

export function formatWhatsAppUrl(phone?: string | null, resiNumber?: string): string | null {
  const normalized = normalizeIndonesianPhone(phone);
  if (!normalized) return null;

  const text = `Halo, kami dari HDL LOGISTIK. Saya sedang mengantarkan kiriman dengan nomor resi ${resiNumber || ''}.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function sanitizeLocationUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Accept only safe http:// or https:// schemes
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return null;
}
