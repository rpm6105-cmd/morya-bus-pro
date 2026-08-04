import { readFileSync } from 'fs';

const CSV = '/Users/rohithpm/Downloads/Untitled spreadsheet - Sheet3.csv';
const EMP = '/tmp/emps.json';
const URL = 'https://tekdmmkkqxjjolzvvnor.supabase.co';
const KEY = process.argv[2];
if (!KEY) { console.error('pass anon key as argv[2]'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function splitCSV(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const normNo = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const strip = (s: string) => String(s || '').trim();
const digits = (s: string) => String(s || '').replace(/\D/g, '');
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

interface Row { layout: '9MTR' | '12MTR' | 'STAFF'; cells: string[]; raw: number; }

function parse() {
  const lines = readFileSync(CSV, 'utf8').split(/\r?\n/);
  const rows: Row[] = [];
  let inHeader = false;
  let layout: '9MTR' | '12MTR' | 'STAFF' | null = null;
  for (const t0 of lines) {
    const t = t0.trim();
    if (!t) { inHeader = false; layout = null; continue; }
    if (/^MTPL 9 Meter Employee data/.test(t)) { layout = '9MTR'; inHeader = false; continue; }
    if (/^KM 12 meter employee master data/.test(t)) { layout = '12MTR'; inHeader = false; continue; }
    if (/^Staff List Dharavi Master data/.test(t)) { layout = 'STAFF'; inHeader = false; continue; }
    if (/^9 meter bus driver Salary master data/.test(t) || /^12 meter bus driver Master data/.test(t) ||
        /^Dharavi Office Staff Salary Calculation/.test(t) || /^VOUCHER SALARY/.test(t)) { layout = null; inHeader = false; continue; }
    if (!layout) continue;
    if (!inHeader) {
      if (/Earlier Emp Code/.test(t) && /ADHAR/.test(t)) inHeader = true;
      continue;
    }
    const cells = splitCSV(t);
    const code = strip(cells[1] || '');
    if (!/^(MTPL|KM)\//.test(code)) continue;
    rows.push({ layout, cells, raw: 0 });
  }
  return rows;
}

async function patch(id: string, body: any) {
  const r = await fetch(URL + `/rest/v1/employees?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status}: ${await r.text()}`);
}

async function main() {
  const rows = parse();
  const emps = JSON.parse(readFileSync(EMP, 'utf8')) as any[];
  const byNo = new Map<string, any>();
  const byCode = new Map<string, any>();
  emps.forEach(e => { byCode.set(e.employeeId, e); if (e.driverNumber) byNo.set(normNo(e.driverNumber), e); });

  const diffs: string[] = [];
  let matched = 0;
  let patched = 0;
  const unmatched: string[] = [];
  const patches: { id: string; body: any }[] = [];

  for (const r of rows) {
    const c = r.cells;
    let emp: any | null = null;
    const code = strip(c[1] || '');
    if (r.layout === 'STAFF') emp = byCode.get(code) || null;
    else {
      const noCands = [c[3], c[5]].map(normNo).filter(Boolean);
      for (const n of noCands) { if (byNo.has(n)) { emp = byNo.get(n); break; } }
      if (!emp) emp = byCode.get(code) || null;
    }
    if (!emp) { unmatched.push(`${r.layout}:${code}`); continue; }
    matched++;

    const at = (i: number) => strip(c[i] || '');
    let f = '', dob = '', doj = '', gen = '', married = '', aadhaar = '', pan = '', aname = '', acct = '', ifsc = '', bank = '', phone = '', uan = '', esic = '', gross = '', remark = '', drv = '';
    if (r.layout === '12MTR') { // drv=2, newDrvPNo=4, name=5, father=6, no married column, remark=20
      drv = at(4) || at(2); f = at(6); dob = at(7); doj = at(8); gen = at(9); aadhaar = at(10); pan = at(11); aname = at(12); acct = at(13); ifsc = at(14); bank = at(15); phone = at(16); uan = at(17); esic = at(18); gross = at(19); remark = at(20);
    } else if (r.layout === '9MTR') { // drv=2, name=3, father=4, gross=18, remark=19
      drv = at(2); f = at(4); dob = at(5); doj = at(6); gen = at(7); married = at(8); aadhaar = at(9); pan = at(10); aname = at(11); acct = at(12); ifsc = at(13); bank = at(14); phone = at(15); uan = at(16); esic = at(17); gross = at(18); remark = at(19);
    } else { // STAFF: drv=2, name=3, father=4, remark=18
      f = at(4); dob = at(5); doj = at(6); gen = at(7); married = at(8); aadhaar = at(9); pan = at(10); aname = at(11); acct = at(12); ifsc = at(13); bank = at(14); phone = at(15); uan = at(16); esic = at(17); remark = at(18);
    }

    const body: Record<string, any> = {};
    if (f) body.fatherName = f.toUpperCase();
    const dobIso = parseDate(dob); if (dobIso) body.dateOfBirth = dobIso;
    const dojIso = parseDate(doj); if (dojIso) body.joiningDate = dojIso;
    if (gen) body.gender = gen.toUpperCase();
    if (married) body.maritalStatus = married.toUpperCase();
    const ad = digits(aadhaar); if (ad.length === 12) body.aadharNumber = ad;
    const pn = strip(pan).toUpperCase(); if (validPan(pn)) body.panNumber = pn;
    if (aname) body.aadhaarName = aname.toUpperCase();
    if (acct) body.bankAccount = acct;
    const ifc = strip(ifsc).toUpperCase(); if (validIfsc(ifc)) body.ifscCode = ifc;
    if (bank) body.bankName = bank.toUpperCase();
    const ph = strip(phone).split('/')[0].trim(); if (ph) body.phone = ph;
    const u = digits(uan); if (u.length === 12 && u !== '000000000000') body.pfUanNumber = u;
    const es = digits(esic); if (es.length >= 9 && es.length <= 12 && es !== '0000000000') body.esicNumber = es;
    if (remark) body.remarks = remark;

    const cur = (k: string) => { const v = (emp as any)[k]; return v === null || v === undefined ? '' : String(v); };
    const drvCur = cur('driverNumber');
    if (drv && (!drvCur || drvCur.includes(' '))) body.driverNumber = drv;
    else if (!drv && drvCur.includes(' ')) body.driverNumber = null;

    if (!emp.busCategory && r.layout !== 'STAFF') body.busCategory = r.layout === '9MTR' ? '9 METER' : '12 METER';
    const grossN = Number(gross);
    if (!emp.salary && r.layout !== 'STAFF' && grossN > 0) { body.salary = grossN; body.grossSalary = grossN; }
    if (emp && emp.basicSalary == null && r.layout !== 'STAFF' && grossN > 0) body.basicSalary = 19700;

    if (!f && /^\d{1,2}\/[A-Z]{3}\/\d{4}$/.test(cur('fatherName'))) body.fatherName = null;
    if (!married && /^\d+$/.test(cur('maritalStatus'))) body.maritalStatus = null;
    if (!aname && /^\d+$/.test(cur('aadhaarName'))) body.aadhaarName = null;
    if (!gen && !/^(MALE|FEMALE|M|F)$/.test(cur('gender'))) body.gender = null;
    if (!acct && validIfsc(cur('bankAccount'))) body.bankAccount = null;
    if (!bank && /^\d+$/.test(cur('bankName'))) body.bankName = null;
    if (!ph && /^\d{12}$/.test(cur('phone'))) body.phone = null;

    if (Object.keys(body).length === 0) continue;
    for (const [k, v] of Object.entries(body)) {
      const old = (emp as any)[k];
      if (old !== null && old !== undefined && String(old) !== '' && String(old) !== String(v)) diffs.push(`${code} (${emp.employeeId}) ${k}: ${old} -> ${v}`);
    }
    patches.push({ id: emp.id, body });
    patched++;
  }

  console.log(`master rows: ${rows.length} | matched: ${matched} | to-patch: ${patched} | unmatched: ${unmatched.length}`);
  unmatched.forEach(u => console.log('  UNMATCHED', u));

  for (let i = 0; i < patches.length; i += 100) {
    await Promise.all(patches.slice(i, i + 100).map(p => patch(p.id, p.body)));
    console.log(`patched ${Math.min(i + 100, patches.length)}/${patches.length}`);
  }
  if (diffs.length) {
    require('fs').writeFileSync('/tmp/master_diff.log', diffs.join('\n'));
    console.log(`\n${diffs.length} field overwrites -> /tmp/master_diff.log`);
  } else console.log('\nno overwrites (all new data)');
}
main().catch(e => { console.error(e); process.exit(1); });
