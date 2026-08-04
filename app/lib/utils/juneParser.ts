import ExcelJS from 'exceljs';
import { AttendanceStatus } from '../types';

export type SheetSource = '9 MTR' | '12 MTR' | 'STAFF';

const SALARY_SHEET_NAMES: Record<SheetSource, string[]> = {
  '9 MTR': ['MTPL 9MTR Salary Current', '9 MTR'],
  '12 MTR': ['KM 12MTR SALARYCurrent', '12 MTR'],
  'STAFF': ['Dharavi Staff Salary', 'Dharavi - Staff Attendance'],
};

const ATTENDANCE_SHEET_NAMES: Record<SheetSource, string[]> = {
  '9 MTR': ['9 MTR', 'MTPL 9MTR Salary Current'],
  '12 MTR': ['12 MTR', 'KM 12MTR SALARYCurrent'],
  'STAFF': ['Dharavi - Staff Attendance', 'Dharavi Staff Salary'],
};

export interface SalaryMasterInput {
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  washing: number;
  medical: number;
  otherAllowance: number;
  gross: number;
  perDayDivisor: number;
  otRatePerHour: number;
}

export interface SalaryRow {
  source: SheetSource;
  code: string;
  name: string;
  driverNo?: string;
  presentDays: number;
  absent: number;
  extra: number;
  totalDays: number;
  weekoff: number;
  payDays: number;
  otHours: number;
  master: SalaryMasterInput;
  earned: { basic: number; hra: number; conveyance: number; washing: number; medical: number; other: number; gross: number };
  otDaysPay: number;
  otHoursPay: number;
  food: number;
  attInc: number;
  deductions: { pf: number; esic: number; pt: number; mlwf: number; other: number; refund: number; totalDed: number };
  net: number;
}

export interface AttendanceRow {
  source: SheetSource;
  code: string;
  name: string;
  driverNo?: string;
  designation?: string;
  dayStatuses: Record<string, AttendanceStatus>;
  presentDays: number;
  weekOff: number;
  extraDays: number;
  totalPayDays: number;
  absDays: number;
}

const num = (v: any): number => {
  if (v === null || v === undefined) return 0;
  let val = v;
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) val = v.result;
    else if (v.text !== undefined && v.text !== null) val = v.text;
    else return 0;
  }
  if (typeof val === 'string') {
    const clean = val.replace(/[,₹\s]/g, '');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  return typeof val === 'number' && !isNaN(val) ? val : 0;
};

const str = (v: any): string => {
  if (v === null || v === undefined) return '';
  let val = v;
  if (typeof v === 'object') {
    if (v.richText && Array.isArray(v.richText)) return v.richText.map((t: any) => t.text || '').join('');
    if (v.result !== undefined && v.result !== null) val = v.result;
    else if (v.text !== undefined && v.text !== null) val = v.text;
  }
  return String(val).replace(/\u00a0/g, ' ').trim();
};

function mapDayCode(code: string): AttendanceStatus | null {
  const c = String(code || '').toUpperCase().trim();
  switch (c) {
    case 'P': case 'SP': case 'HF': case 'BP': case 'TP': case 'BN': case 'PHW':
      return 'P';
    case 'PH':
      return 'H';
    case 'EL': case 'SL': case 'CL': case 'PL':
      return 'PL';
    case 'WO': case 'WOW': case 'COFF': case 'PHF': case 'WOF':
      return 'WO';
    case 'A':
      return 'A';
    case 'LOP':
      return 'LOP';
    default:
      return null;
  }
}

async function loadWorksheet(buffer: ArrayBuffer, source: SheetSource, names: string[]): Promise<ExcelJS.Worksheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  for (const name of names) {
    const ws = wb.getWorksheet(name);
    if (ws) return ws;
  }
  if (wb.worksheets.length > 0) return wb.worksheets[0];
  throw new Error(`No worksheet found for source ${source}`);
}

// ---------------------------------------------------------------
// SALARY SHEETS
// ---------------------------------------------------------------
export async function parseSalaryWorkbook(buffer: ArrayBuffer, source: SheetSource): Promise<SalaryRow[]> {
  const ws = await loadWorksheet(buffer, source, SALARY_SHEET_NAMES[source]);
  const rows: SalaryRow[] = [];
  const startRow = source === '9 MTR' ? 3 : 5;

  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    let code = '';
    let name = '';
    let driverNo: string | undefined;
    let basic = 0;
    let master;
    if (source === '9 MTR') {
      code = str(row.getCell(2).value);
      name = str(row.getCell(4).value);
      driverNo = str(row.getCell(3).value);
      basic = num(row.getCell(18).value);
      master = { basic: num(row.getCell(18).value), da: 0, hra: num(row.getCell(19).value), conveyance: 0, washing: num(row.getCell(20).value), medical: num(row.getCell(21).value), otherAllowance: num(row.getCell(22).value), gross: num(row.getCell(23).value), perDayDivisor: 30, otRatePerHour: 86 };
    } else if (source === '12 MTR') {
      code = str(row.getCell(2).value);
      name = str(row.getCell(5).value);
      driverNo = str(row.getCell(4).value);
      basic = num(row.getCell(18).value);
      master = { basic: num(row.getCell(18).value), da: 0, hra: num(row.getCell(19).value), conveyance: 0, washing: num(row.getCell(20).value), medical: num(row.getCell(21).value), otherAllowance: num(row.getCell(22).value), gross: num(row.getCell(23).value), perDayDivisor: 30, otRatePerHour: 86 };
    } else {
      code = str(row.getCell(2).value);
      name = str(row.getCell(3).value);
      basic = num(row.getCell(7).value);
      master = { basic: num(row.getCell(7).value), da: 0, hra: num(row.getCell(8).value), conveyance: num(row.getCell(9).value), washing: 0, medical: 0, otherAllowance: num(row.getCell(10).value), gross: num(row.getCell(11).value), perDayDivisor: 30, otRatePerHour: 108.33 };
    }
    if (!code || !basic) continue;

    const earned = source === '9 MTR'
      ? { basic: num(row.getCell(25).value), hra: num(row.getCell(26).value), conveyance: 0, washing: num(row.getCell(27).value), medical: num(row.getCell(28).value), other: num(row.getCell(29).value), gross: num(row.getCell(34).value) }
      : source === '12 MTR'
        ? { basic: num(row.getCell(25).value), hra: num(row.getCell(26).value), conveyance: 0, washing: num(row.getCell(27).value), medical: num(row.getCell(28).value), other: num(row.getCell(29).value), gross: num(row.getCell(34).value) }
        : { basic: num(row.getCell(16).value), hra: num(row.getCell(17).value), conveyance: num(row.getCell(18).value), washing: 0, medical: 0, other: num(row.getCell(19).value), gross: num(row.getCell(22).value) };

    const deductions = source === '9 MTR'
      ? { pf: num(row.getCell(36).value), esic: num(row.getCell(37).value), pt: num(row.getCell(38).value), mlwf: num(row.getCell(39).value), other: num(row.getCell(40).value), refund: num(row.getCell(42).value), totalDed: num(row.getCell(41).value) }
      : source === '12 MTR'
        ? { pf: num(row.getCell(36).value), esic: num(row.getCell(37).value), pt: num(row.getCell(38).value), mlwf: num(row.getCell(39).value), other: num(row.getCell(40).value), refund: num(row.getCell(43).value), totalDed: num(row.getCell(41).value) }
        : { pf: num(row.getCell(23).value), esic: num(row.getCell(24).value), pt: num(row.getCell(25).value), mlwf: num(row.getCell(26).value), other: num(row.getCell(27).value), refund: num(row.getCell(29).value), totalDed: num(row.getCell(28).value) };

    rows.push({
      source,
      code,
      name,
      driverNo,
      presentDays: source === 'STAFF' ? num(row.getCell(12).value) : source === '12 MTR' ? num(row.getCell(8).value) : num(row.getCell(7).value),
      absent: source === 'STAFF' ? 0 : source === '12 MTR' ? num(row.getCell(9).value) : num(row.getCell(8).value),
      extra: source === 'STAFF' ? num(row.getCell(14).value) : source === '12 MTR' ? num(row.getCell(10).value) : num(row.getCell(9).value),
      totalDays: source === 'STAFF' ? num(row.getCell(12).value) : source === '12 MTR' ? num(row.getCell(11).value) : num(row.getCell(10).value),
      weekoff: source === 'STAFF' ? 0 : source === '12 MTR' ? num(row.getCell(12).value) : num(row.getCell(11).value),
      payDays: source === 'STAFF' ? num(row.getCell(13).value) : source === '12 MTR' ? num(row.getCell(13).value) : num(row.getCell(12).value),
      otHours: source === 'STAFF' ? num(row.getCell(15).value) : source === '12 MTR' ? num(row.getCell(14).value) : num(row.getCell(13).value),
      master,
      earned,
      otDaysPay: source === 'STAFF' ? num(row.getCell(20).value) : num(row.getCell(30).value),
      otHoursPay: source === 'STAFF' ? num(row.getCell(21).value) : num(row.getCell(31).value),
      food: source === 'STAFF' ? 0 : num(row.getCell(32).value),
      attInc: source === 'STAFF' ? 0 : num(row.getCell(33).value),
      deductions,
      net: source === 'STAFF' ? num(row.getCell(30).value) : source === '9 MTR' ? num(row.getCell(43).value) : num(row.getCell(44).value),
    });
  }

  // Staff salary sheets carry a secondary "VOUCHER SALARY - STAFF" block (R18+)
  // with a different layout: code col2, name col3, basic col4, perDay col5,
  // gross col6, totalDays col12, present col13, weekoff col14, net col30.
  // Main-section rows have basic in col7; voucher rows have basic in col4 only.
  if (source === 'STAFF') {
    const mainCodes = new Set(rows.map(r => r.code));
    for (let r = startRow; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const code = str(row.getCell(2).value);
      if (!code) continue;
      if (num(row.getCell(7).value) > 0) continue; // already parsed as a main-section row
      const basic = num(row.getCell(4).value);
      if (!basic) continue;
      const base = code.replace(/-\d+$/, '');
      if (mainCodes.has(base)) continue; // partial-month supplement; main row already covers the month
      const name = str(row.getCell(3).value);
      const gross = num(row.getCell(6).value);
      const net = num(row.getCell(30).value);
      if (!gross || !net) continue; // no-data (e.g. KLS020 net 0)
      const master: SalaryMasterInput = { basic, da: 0, hra: 0, conveyance: 0, washing: 0, medical: 0, otherAllowance: 0, gross, perDayDivisor: 30, otRatePerHour: 108.33 };
      rows.push({
        source,
        code,
        name,
        presentDays: num(row.getCell(13).value),
        absent: 0,
        extra: 0,
        totalDays: num(row.getCell(12).value),
        weekoff: num(row.getCell(14).value),
        payDays: num(row.getCell(13).value),
        otHours: 0,
        master,
        earned: { basic, hra: 0, conveyance: 0, washing: 0, medical: 0, other: 0, gross },
        otDaysPay: 0,
        otHoursPay: 0,
        food: 0,
        attInc: 0,
        deductions: { pf: 0, esic: 0, pt: 0, mlwf: 0, other: 0, refund: Math.max(0, net - gross), totalDed: 0 },
        net,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------
// ATTENDANCE SHEETS
// ---------------------------------------------------------------
export async function parseAttendanceWorkbook(buffer: ArrayBuffer, source: SheetSource, month: number, year: number): Promise<AttendanceRow[]> {
  const ws = await loadWorksheet(buffer, source, ATTENDANCE_SHEET_NAMES[source]);
  const rows: AttendanceRow[] = [];
  const dayStartCol = source === 'STAFF' ? 7 : 8;
  const dayEndCol = dayStartCol + 29;
  const is9 = source === '9 MTR';
  const is12 = source === '12 MTR';
  const totalPresentCol = source === 'STAFF' ? 37 : is12 ? 49 : 50;
  const totalWeekOffCol = source === 'STAFF' ? 38 : is12 ? 48 : 49;
  const extraDaysCol = source === 'STAFF' ? 51 : is12 ? 50 : 51;
  const totalPayDaysCol = source === 'STAFF' ? 50 : is12 ? 51 : 52;
  const absDaysCol = source === 'STAFF' ? 49 : is12 ? 46 : 47;
  const startRow = source === 'STAFF' ? 4 : 5;

  const seenCodes = new Set<string>();
  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = str(row.getCell(2).value);
    if (!code) continue;
    if (seenCodes.has(code)) continue; // skip WOW/DD/OT continuation sub-rows (may be non-consecutive)
    seenCodes.add(code);
    const name = str(row.getCell(source === 'STAFF' ? 3 : 4).value);

    const dayStatuses: Record<string, AttendanceStatus> = {};
    for (let d = 1; d <= 30; d++) {
      const cellVal = str(row.getCell(dayStartCol + d - 1).value);
      const status = mapDayCode(cellVal);
      if (!status) continue;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dayStatuses[dateStr] = status;
    }

    rows.push({
      source,
      code,
      name,
      designation: source === 'STAFF' ? str(row.getCell(4).value) : undefined,
      driverNo: source === 'STAFF' ? undefined : str(row.getCell(7).value),
      dayStatuses,
      presentDays: num(row.getCell(totalPresentCol).value),
      weekOff: num(row.getCell(totalWeekOffCol).value),
      extraDays: num(row.getCell(extraDaysCol).value),
      totalPayDays: num(row.getCell(totalPayDaysCol).value),
      absDays: num(row.getCell(absDaysCol).value),
    });
  }
  return rows;
}
