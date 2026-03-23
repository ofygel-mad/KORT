/**
 * Проверяет контрольную сумму БИН/ИИН Казахстана (12 цифр).
 * Алгоритм: сумма (digit_i * weight_i) mod 11, если 10 — второй проход с другими весами.
 */
export function validateBinIin(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return false;

  const d = digits.split('').map(Number);
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

  let sum = 0;
  for (let i = 0; i < 11; i++) sum += d[i] * w1[i];
  let check = sum % 11;

  if (check === 10) {
    sum = 0;
    for (let i = 0; i < 11; i++) sum += d[i] * w2[i];
    check = sum % 11;
  }

  return check === d[11];
}

export function isBin(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 12 && (d[4] === '4' || d[4] === '5');
}

export function isIin(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 12 && !isBin(d);
}

export function formatBinIin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

function readKazakhPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits === '7') {
    return '7';
  }

  if (digits.startsWith('8')) {
    return `7${digits.slice(1)}`.slice(0, 11);
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return digits.slice(0, 11);
  }

  if (digits.length <= 10) {
    return `7${digits}`.slice(0, 11);
  }

  return `7${digits.slice(-10)}`.slice(0, 11);
}

export function formatKazakhPhoneInput(value: string): string {
  const digits = readKazakhPhoneDigits(value);
  const national = digits.startsWith('7') ? digits.slice(1) : digits;

  if (!digits.length) {
    return '';
  }

  if (!national.length) {
    return '+7';
  }

  let formatted = '+7';

  if (national.length > 0) {
    formatted += ` (${national.slice(0, 3)}`;
  }

  if (national.length >= 4) {
    formatted += `) ${national.slice(3, 6)}`;
  }

  if (national.length >= 7) {
    formatted += `-${national.slice(6, 8)}`;
  }

  if (national.length >= 9) {
    formatted += `-${national.slice(8, 10)}`;
  }

  return formatted;
}

export function isKazakhPhoneComplete(value: string): boolean {
  const digits = readKazakhPhoneDigits(value);
  return digits.length === 11 && digits.startsWith('7');
}

export function normalizeKazakhPhone(value: string): string | null {
  const digits = readKazakhPhoneDigits(value);
  if (digits.length !== 11 || !digits.startsWith('7')) {
    return null;
  }

  return `+${digits}`;
}

/**
 * Форматирует казахстанский номер телефона для wa.me
 * +7 700 123 45 67 → 77001234567
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const normalized = normalizeKazakhPhone(phone);
  return normalized ? normalized.slice(1) : phone.replace(/\D/g, '');
}
