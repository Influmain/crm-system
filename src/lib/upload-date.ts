import { SSF } from 'xlsx';

// Excel stores dates as serial numbers; PostgreSQL expects a date or timestamp.
export function normalizeUploadDate(value: unknown, date1904 = false): string | null {
  if (value == null || String(value).trim() === '') return null;
  if (typeof value === 'number') {
    const date = SSF.parse_date_code(value, { date1904 });
    if (!date || date.y < 1 || date.m < 1 || date.d < 1) {
      throw new Error('유효하지 않은 Excel 날짜입니다.');
    }
    return `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const plainDate = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (plainDate) {
    const [, year, month, day] = plainDate;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso) return iso;
  } else if (!/^\d+$/.test(text) && Number.isFinite(Date.parse(text))) {
    return new Date(text).toISOString();
  }
  throw new Error('날짜 형식을 확인해주세요 (YYYY-MM-DD).');
}
