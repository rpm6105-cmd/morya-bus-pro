import ExcelJS from 'exceljs';
import {
  normalizeAadhaar,
  normalizeBankAccount,
  normalizeIFSC,
  normalizePhone,
  normalizeUAN,
  validateEmployeeMaster,
} from '../utils/validation';

export interface ImportedEmployee {
  employeeId: string;
  name: string;
  fatherName: string;
  driverNumber: string;
  dateOfBirth: string;
  joiningDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  maritalStatus: 'MARRIED' | 'UNMARRIED' | 'UNKNOWN';
  aadharNumber: string;
  panNumber: string;
  aadhaarName: string;
  bankAccount: string;
  ifscCode: string;
  bankName: string;
  mobile: string;
  uanNumber: string;
  prevPfAccount: string;
  prevPension: string;
  prevPfTransfer: string;
  prevEsic: string;
  basicSalary?: number;
  pfLimit?: number;
  grossSalary?: number;
  remarks: string;
  sourceSheet: string;
  category: 'DRIVERS' | 'STAFF';
  rowNumber: number;
}

export interface ImportIssue {
  sheet: string;
  rowNumber: number;
  employeeId: string;
  name: string;
  issues: { field: string; value: string; message: string }[];
}

export interface ImportResult {
  employees: ImportedEmployee[];
  issues: ImportIssue[];
  duplicateIds: { employeeId: string; sheets: string[] }[];
  summary: { sheet: string; total: number; ok: number; withIssues: number; skippedBlank: number }[];
}

const normalizeHeader = (h: string) => String(h || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const HEADER_MAP: { key: string; match: string[] }[] = [
  { key: 'srNo', match: ['SRNO'] },
  { key: 'employeeId', match: ['EARLIEREMPCODE'] },
  { key: 'driverNumber', match: ['DRIVERNO'] },
  { key: 'name', match: ['EMPLOYEEFULLNAME'] },
  { key: 'fatherName', match: ['FATHERHUSBANDNAME'] },
  { key: 'basicSalary', match: ['FULLMONTHBASICSALARY', 'BASICSALARY'] },
  { key: 'pfLimit', match: ['PFBASICLIMIT'] },
  { key: 'dateOfBirth', match: ['DOB'] },
  { key: 'joiningDate', match: ['DOJ'] },
  { key: 'gender', match: ['MALEFEMALE'] },
  { key: 'maritalStatus', match: ['MARRIEDUNMARRIED'] },
  { key: 'aadharNumber', match: ['ADHARCARDNO', 'ADHARNUMBER'] },
  { key: 'panNumber', match: ['PANCARDNO'] },
  { key: 'aadhaarName', match: ['MEMBERADHARCARDNAME'] },
  { key: 'bankAccount', match: ['BANKACNOIFCSCODENO', 'BANKACCOUNT'] },
  { key: 'ifscCode', match: ['IFSCCODENO'] },
  { key: 'bankName', match: ['MEMBERBANKACNAME'] },
  { key: 'mobile', match: ['MOBILENO', 'MOBILE'] },
  { key: 'uanNumber', match: ['PREVIOUSCOMPANYUANNO', 'UANNO', 'UAN'] },
  { key: 'prevPfAccount', match: ['PREVIOUSCOMPANYPFACNO'] },
  { key: 'prevPension', match: ['PREVIOUSCOMPANYPENSIONMEMBERSHIPYESORNO'] },
  { key: 'prevPfTransfer', match: ['PREVIOUSCOMPANYPFTRANSFERORWITHDRAW'] },
  { key: 'prevEsic', match: ['PREVIOUSCOMPANYESICNUMBER', 'ESICNUMBER'] },
  { key: 'grossSalary', match: ['GROSSSALARY'] },
  { key: 'remarks', match: ['REMARK'] },
];

const SHEET_KEYWORDS: { keyword: string; category: 'DRIVERS' | 'STAFF'; busCategory: string }[] = [
  { keyword: '9MTR', category: 'DRIVERS', busCategory: '9 METER' },
  { keyword: '12MTR', category: 'DRIVERS', busCategory: '12 METER' },
  { keyword: 'STAFF', category: 'STAFF', busCategory: '' },
];

function sheetMeta(sheetName: string): { category: 'DRIVERS' | 'STAFF'; busCategory: string } {
  const upper = sheetName.toUpperCase();
  const hit = SHEET_KEYWORDS.find(s => upper.includes(s.keyword));
  if (hit) return { category: hit.category, busCategory: hit.busCategory };
  return { category: sheetName.toUpperCase().includes('STAFF') ? 'STAFF' : 'DRIVERS', busCategory: '' };
}

function excelDateToISO(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number' && v > 1000 && v < 60000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dm) return `${dm[3]}-${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}`;
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return '';
}

function toNumeric(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return isNaN(v) ? undefined : v;
  const s = String(v).replace(/[^\d.]/g, '');
  if (!s) return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function normText(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\u00a0/g, ' ').trim();
}

function findHeaderRow(ws: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= Math.min(ws.rowCount, 8); r++) {
    const row = ws.getRow(r);
    const vals: string[] = [];
    for (let c = 1; c <= row.cellCount; c++) vals.push(normalizeHeader(normText(row.getCell(c).value)));
    if (vals.some(v => v.includes('EMPLOYEEFULLNAME')) || vals.some(v => v.includes('EARLIEREMPCODE'))) return r;
  }
  return null;
}

export async function parseEmployeeMasterWorkbook(input: ArrayBuffer | Uint8Array | Blob): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  const arr = input instanceof Blob
    ? new Uint8Array(await input.arrayBuffer())
    : input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  await wb.xlsx.load(arr as never);

  const employees: ImportedEmployee[] = [];
  const issues: ImportIssue[] = [];
  const summary: ImportResult['summary'] = [];
  const seenCodes = new Map<string, string[]>();

  for (const ws of wb.worksheets) {
    const meta = sheetMeta(ws.name);
    const headerRow = findHeaderRow(ws);
    if (!headerRow) {
      summary.push({ sheet: ws.name, total: 0, ok: 0, withIssues: 0, skippedBlank: 0 });
      continue;
    }

    const colIdx = new Map<string, number>();
    const headerVals: string[] = [];
    const headerRowObj = ws.getRow(headerRow);
    for (let c = 1; c <= headerRowObj.cellCount; c++) headerVals.push(normText(headerRowObj.getCell(c).value));
    headerVals.forEach((hv, idx) => {
      const col = idx + 1;
      const norm = normalizeHeader(normText(hv));
      if (!norm) return;
      const matched = HEADER_MAP.find(h => h.match.some(m => norm.includes(m)));
      if (matched && !colIdx.has(matched.key)) colIdx.set(matched.key, col);
    });

    if (!colIdx.has('employeeId') && !colIdx.has('name')) {
      summary.push({ sheet: ws.name, total: 0, ok: 0, withIssues: 0, skippedBlank: 0 });
      continue;
    }

    const get = (key: string, row: ExcelJS.Row) => (colIdx.has(key) ? row.getCell(colIdx.get(key) as number).value : '');

    let total = 0, ok = 0, withIssues = 0, skippedBlank = 0;

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const code = normText(get('employeeId', row));
      const name = normText(get('name', row));
      const srNo = normText(get('srNo', row));
      if (!code && !name && !srNo) { skippedBlank++; continue; }
      total++;

      const aadhar = normalizeAadhaar(normText(get('aadharNumber', row)));
      const emp: ImportedEmployee = {
        employeeId: code,
        name,
        fatherName: normText(get('fatherName', row)),
        driverNumber: normText(get('driverNumber', row)),
        dateOfBirth: excelDateToISO(get('dateOfBirth', row)),
        joiningDate: excelDateToISO(get('joiningDate', row)),
        gender: (normText(get('gender', row)).toUpperCase() || 'MALE') as 'MALE',
        maritalStatus: normText(get('maritalStatus', row)).toUpperCase() === 'UMARRIED' ? 'UNMARRIED' : (normText(get('maritalStatus', row)).toUpperCase() as 'MARRIED' | 'UNMARRIED' | 'UNKNOWN'),
        aadharNumber: aadhar,
        panNumber: normText(get('panNumber', row)).toUpperCase(),
        aadhaarName: normText(get('aadhaarName', row)),
        bankAccount: normalizeBankAccount(normText(get('bankAccount', row))),
        ifscCode: normalizeIFSC(normText(get('ifscCode', row))),
        bankName: normText(get('bankName', row)),
        mobile: normalizePhone(normText(get('mobile', row))),
        uanNumber: normalizeUAN(normText(get('uanNumber', row))),
        prevPfAccount: normText(get('prevPfAccount', row)),
        prevPension: normText(get('prevPension', row)),
        prevPfTransfer: normText(get('prevPfTransfer', row)),
        prevEsic: normText(get('prevEsic', row)),
        basicSalary: toNumeric(get('basicSalary', row)),
        pfLimit: toNumeric(get('pfLimit', row)),
        grossSalary: toNumeric(get('grossSalary', row)),
        remarks: normText(get('remarks', row)),
        sourceSheet: ws.name,
        category: meta.category,
        rowNumber: r,
      };

      const detected = validateEmployeeMaster({
        employeeId: emp.employeeId,
        name: emp.name,
        dateOfBirth: emp.dateOfBirth,
        joiningDate: emp.joiningDate,
        gender: emp.gender,
        aadharNumber: emp.aadharNumber,
        panNumber: emp.panNumber,
        mobile: emp.mobile,
        bankAc: emp.bankAccount,
        ifsc: emp.ifscCode,
        uan: emp.uanNumber,
      });
      const hasIssues = detected.length > 0;
      if (hasIssues) withIssues++; else ok++;

      if (code) {
        const prev = seenCodes.get(code) || [];
        prev.push(ws.name);
        seenCodes.set(code, prev);
      }

      employees.push(emp);
      if (hasIssues) {
        issues.push({ sheet: ws.name, rowNumber: r, employeeId: code, name, issues: detected });
      }
    }

    summary.push({ sheet: ws.name, total, ok, withIssues, skippedBlank });
  }

  const duplicateIds = [...seenCodes.entries()]
    .filter(([, sheets]) => sheets.length > 1)
    .map(([employeeId, sheets]) => ({ employeeId, sheets }));

  return { employees, issues, duplicateIds, summary };
}

export function buildEmployeePayload(e: ImportedEmployee, branchId: string): Record<string, unknown> {
  return {
    employeeId: e.employeeId,
    name: e.name,
    fatherName: e.fatherName,
    aadharNumber: e.aadharNumber,
    dateOfBirth: e.dateOfBirth,
    gender: e.gender,
    phone: e.mobile,
    designation: e.category === 'DRIVERS' ? 'Driver' : 'Staff',
    branchId,
    salary: 0,
    bankAccount: e.bankAccount,
    ifscCode: e.ifscCode,
    bankName: e.bankName,
    panNumber: e.panNumber,
    joiningDate: e.joiningDate,
    status: 'ACTIVE',
    driverNumber: e.driverNumber,
    maritalStatus: e.maritalStatus,
    aadhaarName: e.aadhaarName,
    basicSalary: e.basicSalary || 0,
    pfLimit: e.pfLimit || 0,
    grossSalary: e.grossSalary || 0,
    prevPfAccount: e.prevPfAccount,
    prevPension: e.prevPension,
    prevPfTransfer: e.prevPfTransfer,
    prevEsic: e.prevEsic,
    remarks: e.remarks,
    pfUanNumber: e.uanNumber,
    esicNumber: e.prevEsic,
  };
}
