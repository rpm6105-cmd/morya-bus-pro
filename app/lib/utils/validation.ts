import { normalizeAadhaar } from './incentive';

export { normalizeAadhaar } from './incentive';

export const normalizeUAN = (uan: string) => String(uan || '').replace(/[^\d]/g, '').replace(/^0+/, '');
export const normalizeIFSC = (ifsc: string) => String(ifsc || '').trim().toUpperCase();
export const normalizePhone = (phone: string) => {
  let clean = String(phone || '').replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length > 10) clean = clean.slice(2);
  if (clean.startsWith('0')) clean = clean.slice(1);
  return clean;
};
export const normalizeBankAccount = (acct: string) => String(acct || '').replace(/\s+/g, '');

export function isValidAadhaar(aadhaar: string): boolean {
  return /^\d{12}$/.test(normalizeAadhaar(aadhaar));
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(String(pan || '').trim().toUpperCase());
}

export function isValidUAN(uan: string): boolean {
  const clean = normalizeUAN(uan);
  if (!clean) return true; // optional field
  return /^\d{12}$/.test(clean);
}

export function isValidIFSC(ifsc: string): boolean {
  const clean = normalizeIFSC(ifsc);
  if (!clean) return false;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
}

export function isValidPhone(phone: string): boolean {
  const clean = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(clean);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function isValidDate(d: string): boolean {
  if (!d) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return !isNaN(new Date(d + 'T00:00:00Z').getTime());
  return false;
}

export function isDateInPastOrToday(d: string): boolean {
  return isValidDate(d) && new Date(d + 'T00:00:00Z').getTime() <= Date.now();
}

// IFSC prefix (first 4 chars) -> canonical bank name/category
export const BANK_BY_IFSC_PREFIX: Record<string, { name: string; category: string }> = {
  SBIN: { name: 'STATE BANK OF INDIA', category: 'PUBLIC' },
  MAHB: { name: 'BANK OF MAHARASHTRA', category: 'PUBLIC' },
  BARB: { name: 'BANK OF BARODA', category: 'PUBLIC' },
  UBIN: { name: 'UNION BANK OF INDIA', category: 'PUBLIC' },
  CNRB: { name: 'CANARA BANK', category: 'PUBLIC' },
  BKID: { name: 'BANK OF INDIA', category: 'PUBLIC' },
  HDFC: { name: 'HDFC BANK', category: 'PRIVATE' },
  ABHY: { name: 'ABHYUDAYA CO-OPERATIVE BANK', category: 'COOPERATIVE' },
  ICIC: { name: 'ICICI BANK', category: 'PRIVATE' },
  UTIB: { name: 'AXIS BANK', category: 'PRIVATE' },
  IDIB: { name: 'INDIAN BANK', category: 'PUBLIC' },
  CBIN: { name: 'CENTRAL BANK OF INDIA', category: 'PUBLIC' },
  SVCB: { name: 'SVC CO-OPERATIVE BANK', category: 'COOPERATIVE' },
  MAHG: { name: 'MAHARASHTRA GRAMIN BANK', category: 'PUBLIC' },
  IDFB: { name: 'IDFC FIRST BANK', category: 'PRIVATE' },
  IDBI: { name: 'IDBI BANK', category: 'PRIVATE' },
  IBKL: { name: 'IDBI BANK', category: 'PRIVATE' },
  KKBK: { name: 'KOTAK MAHINDRA BANK', category: 'PRIVATE' },
  NKGS: { name: 'NKGSB CO-OPERATIVE BANK', category: 'COOPERATIVE' },
  JSBL: { name: 'JANAKALYAN SAHAKARI BANK', category: 'COOPERATIVE' },
  IOBA: { name: 'INDIAN OVERSEAS BANK', category: 'PUBLIC' },
  SRCB: { name: 'SARASWAT CO-OPERATIVE BANK', category: 'COOPERATIVE' },
  ASBL: { name: 'APNA SAHAKARI BANK', category: 'COOPERATIVE' },
};

export function normalizeBankName(ifsc: string): { name: string; category: string } | null {
  const prefix = normalizeIFSC(ifsc).slice(0, 4);
  return BANK_BY_IFSC_PREFIX[prefix] || null;
}

export interface ValidationIssue {
  field: string;
  value: string;
  message: string;
}

export function isValidBankAccount(acct: string): boolean {
  const clean = normalizeBankAccount(acct);
  if (!clean) return true; // optional
  return /^[A-Za-z0-9]+$/.test(clean) && clean.length >= 6;
}

// Validates a full employee master record. Returns list of issues (empty = valid).
export function validateEmployeeMaster(e: {
  employeeId: string;
  name: string;
  dateOfBirth?: string;
  joiningDate?: string;
  gender?: string;
  aadharNumber?: string;
  panNumber?: string;
  mobile?: string;
  bankAc?: string;
  ifsc?: string;
  uan?: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (field: string, value: string, message: string) => issues.push({ field, value, message });

  if (!e.employeeId) push('employeeId', e.employeeId, 'Employee code is required');
  if (!e.name || e.name.trim().length < 3) push('name', e.name, 'Name is required (min 3 chars)');
  if (e.dateOfBirth && !isValidDate(e.dateOfBirth)) push('dateOfBirth', e.dateOfBirth, 'DOB must be YYYY-MM-DD');
  if (e.joiningDate && !isValidDate(e.joiningDate)) push('joiningDate', e.joiningDate, 'DOJ must be YYYY-MM-DD');
  if (e.gender && !['MALE', 'FEMALE', 'OTHER'].includes(e.gender.toUpperCase())) push('gender', e.gender, 'Gender must be MALE/FEMALE/OTHER');
  if (e.aadharNumber && !isValidAadhaar(e.aadharNumber)) push('aadharNumber', e.aadharNumber, 'Aadhaar must be 12 digits');
  if (e.panNumber && !isValidPAN(e.panNumber)) push('panNumber', e.panNumber, 'PAN format invalid (ABCDE1234F)');
  if (e.mobile && !isValidPhone(e.mobile)) push('mobile', e.mobile, 'Mobile must be a valid 10-digit number');
  if (e.bankAc && !isValidBankAccount(e.bankAc)) push('bankAc', e.bankAc, 'Bank account has invalid characters');
  if (e.ifsc && !isValidIFSC(e.ifsc)) push('ifsc', e.ifsc, 'IFSC format invalid');
  if (e.uan && !isValidUAN(e.uan)) push('uan', e.uan, 'UAN must be 12 digits');
  return issues;
}
