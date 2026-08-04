import { readFileSync } from 'fs';

const CSV = '/Users/rohithpm/Downloads/Untitled spreadsheet - Sheet3.csv';
const EMP = '/tmp/emps.json';
const URL = 'https://tekdmmkkqxjjolzvvnor.supabase.co';
const KEY = process.argv[2];
if (!KEY) { console.error('pass anon key as argv[2]'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

function splitCSV(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
const strip = (s: string) => String(s || '').trim();
const digits = (s: string) => String(s || '').replace(/\D/g, '');
const normNo = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
function parseDate(s: string): string | null {
  const m = strip(s).match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!m) return null;
  const mm = MONTHS[m[2].toUpperCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}
const validIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s);
const validPan = (s: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s);

function parse() {
  const lines = readFileSync(CSV, 'utf8').split(/\r?\n/);
  const rows: { layout: string; cells: string[] }[] = [];
  let inHeader = false, layout: string | null = null;
  for (const t0 of lines) {
    const t = t0.trim();
    if (!t) { inHeader = false; layout = null; continue; }
    if (/^MTPL 9 Meter Employee data/.test(t)) { layout = '9MTR'; inHeader = false; continue; }
    if (/^KM 12 meter employee master data/.test(t)) { layout = '12MTR'; inHeader = false; continue; }
    if (/^Staff List Dharavi Master data/.test(t)) { layout = 'STAFF'; inHeader = false; continue; }
    if (/9 meter bus driver Salary master data|12 meter bus driver Master data|Dharavi Office Staff Salary Calculation|VOUCHER SALARY/.test(t)) { layout = null; inHeader = false; continue; }
    if (!layout) continue;
    if (!inHeader) { if (/Earlier Emp Code/.test(t) && /ADHAR/.test(t)) inHeader = true; continue; }
    const cells = splitCSV(t);
    if (!/^(MTPL|KM)\//.test(strip(cells[1] || ''))) continue;
    rows.push({ layout, cells });
  }
  return rows;
}

function fields(r: { layout: string; cells: string[] }) {
  const c = r.cells, at = (i: number) => strip(c[i] || '');
  let f = '', dob = '', doj = '', gen = '', married = '', aadhaar = '', pan = '', aname = '', acct = '', ifsc = '', bank = '', phone = '', uan = '', esic = '', gross = '', remark = '', drv = '';
  if (r.layout === '12MTR') { drv = at(2) || at(4); f = at(6); dob = at(7); doj = at(8); gen = at(9); aadhaar = at(10); pan = at(11); aname = at(12); acct = at(13); ifsc = at(14); bank = at(15); phone = at(16); uan = at(17); esic = at(18); gross = at(19); remark = at(20); }
  else if (r.layout === '9MTR') { drv = at(2); f = at(4); dob = at(5); doj = at(6); gen = at(7); married = at(8); aadhaar = at(9); pan = at(10); aname = at(11); acct = at(12); ifsc = at(13); bank = at(14); phone = at(15); uan = at(16); esic = at(17); gross = at(18); remark = at(19); }
  else { f = at(4); dob = at(5); doj = at(6); gen = at(7); married = at(8); aadhaar = at(9); pan = at(10); aname = at(11); acct = at(12); ifsc = at(13); bank = at(14); phone = at(15); uan = at(16); esic = at(17); remark = at(18); }
  const exp: Record<string, string> = {};
  if (f) exp.fatherName = f.toUpperCase();
  const di = parseDate(dob); if (di) exp.dateOfBirth = di;
  const dj = parseDate(doj); if (dj) exp.joiningDate = dj;
  if (gen) exp.gender = gen.toUpperCase();
  if (married) exp.maritalStatus = married.toUpperCase();
  const ad = digits(aadhaar); if (ad.length === 12) exp.aadharNumber = ad;
  const pn = strip(pan).toUpperCase(); if (validPan(pn)) exp.panNumber = pn;
  if (aname) exp.aadhaarName = aname.toUpperCase();
  if (acct) exp.bankAccount = acct;
  const ifc = strip(ifsc).toUpperCase(); if (validIfsc(ifc)) exp.ifscCode = ifc;
  if (bank) exp.bankName = bank.toUpperCase();
  const ph = strip(phone).split('/')[0].trim(); if (ph) exp.phone = ph;
  const u = digits(uan); if (u.length === 12 && u !== '000000000000') exp.pfUanNumber = u;
  const es = digits(esic); if (es.length >= 9 && es.length <= 12 && es !== '0000000000') exp.esicNumber = es;
  if (remark) exp.remarks = remark;
  if (drv) exp.driverNumber = drv;
  return { code: at(1), layout: r.layout, drv, exp };
}

async function main() {
  const emps = JSON.parse(readFileSync(EMP, 'utf8')) as any[];
  const byNo = new Map<string, any>();
  const byCode = new Map<string, any>();
  emps.forEach(e => { byCode.set(e.employeeId, e); if (e.driverNumber) byNo.set(normNo(e.driverNumber), e); });

  const rows = parse();
  const mismatches: string[] = [];
  let checked = 0, matched = 0;
  for (const r of rows) {
    const { code, layout, exp } = fields(r);
    let emp: any = null;
    if (layout === 'STAFF') emp = byCode.get(code) || null;
    else {
      emp = byCode.get(code) || null;
      if (!emp) {
        const cands = [r.cells[2], r.cells[4]].map(normNo).filter(Boolean);
        for (const n of cands) { if (byNo.has(n)) { emp = byNo.get(n); break; } }
      }
    }
    if (!emp) continue;
    matched++;
    for (const [k, v] of Object.entries(exp)) {
      checked++;
      const cur = (emp as any)[k];
      const c = cur === null || cur === undefined ? '' : String(cur);
      if (c !== v) mismatches.push(`${code} (${emp.employeeId}) ${k}: expected "${v}" got "${c}"`);
    }
  }
  console.log(`rows: ${rows.length} | matched: ${matched} | field checks: ${checked} | mismatches: ${mismatches.length}`);
  mismatches.slice(0, 60).forEach(m => console.log('  MISMATCH', m));
  if (mismatches.length) {
    require('fs').writeFileSync('/tmp/master_verify.log', mismatches.join('\n'));
    console.log(`full list -> /tmp/master_verify.log`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
