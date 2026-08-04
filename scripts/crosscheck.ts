import { readFileSync } from 'fs';
import { parseSalaryWorkbook, parseAttendanceWorkbook, SheetSource } from '../app/lib/utils/juneParser';

const URL = 'https://tekdmmkkqxjjolzvvnor.supabase.co';
const KEY = process.argv[2]!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const get = async (path: string) => { const r = await fetch(URL + path, { headers: H }); if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`); return r.json(); };

function norm(s: string) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normNo(s: string) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

const DIR = '/Users/rohithpm/Downloads/Kalakilla Dpeot (Dharavi)/';
const load = (f: string) => readFileSync(DIR + f).buffer.slice(0);
const FILES: [string, SheetSource][] = [
  ['1. 9 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx', '9 MTR'],
  ['2. 12 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx', '12 MTR'],
  ['3. KKD STAFF ATTN & SALARY - JUNE 2026.xlsx', 'STAFF'],
];

async function main() {
  const salaryRows = (await Promise.all(FILES.map(([f, s]) => parseSalaryWorkbook(load(f), s)))).flat();
  const attRows = (await Promise.all(FILES.map(([f, s]) => parseAttendanceWorkbook(load(f), s, 6, 2026)))).flat();

  const emps = await get('/rest/v1/employees?select=id,employeeId,name,subDepotCategory,driverNumber&limit=2000') as any[];
  const payAll: any[] = [];
  for (let off = 0; off < 6000; off += 1000) { const c = await get(`/rest/v1/payroll?select=employeeId,grossSalary,netSalary&month=eq.Jun&year=eq.2026&offset=${off}&limit=1000`); payAll.push(...c); if (c.length < 1000) break; }
  const attAll: any[] = [];
  for (let off = 0; off < 6000; off += 1000) { const c = await get(`/rest/v1/attendance?select=employeeId,status&date=gte.2026-06-01&date=lte.2026-06-30&offset=${off}&limit=1000`); attAll.push(...c); if (c.length < 1000) break; }

  const byId = new Map(emps.map((e: any) => [e.id, e]));
  const byCode = new Map(emps.map((e: any) => [norm(e.employeeId), e]));
  const byPNo = new Map(emps.map((e: any) => (e.driverNumber ? [normNo(e.driverNumber), e] : null)).filter(Boolean) as any[]);
  const payByEmp = new Map<string, any>();
  payAll.forEach(p => payByEmp.set(p.employeeId, p));
  const attCount = new Map<string, number>();
  attAll.forEach(a => attCount.set(a.employeeId, (attCount.get(a.employeeId) || 0) + 1));

  const match = (code: string, driverNo?: string): any => (driverNo ? byPNo.get(normNo(driverNo)) : null) || byCode.get(norm(code));

  let attMatched = 0, attUnmatched = 0, attNoPay = 0, salMatched = 0, salUnmatched = 0;
  const problems: string[] = [];

  console.log('== ATTENDANCE rows ==');
  for (const r of attRows) {
    const emp = match(r.code, r.driverNo);
    if (!emp) { attUnmatched++; problems.push(`att unmatched: ${r.source}:${r.code}:${r.name}:${r.driverNo}`); continue; }
    attMatched++;
    const pay = payByEmp.get(emp.id);
    if (!pay) { attNoPay++; problems.push(`attendance but NO payroll: ${emp.employeeId} ${emp.name} (${r.source}:${r.code})`); }
  }
  console.log(`matched ${attMatched}, unmatched ${attUnmatched}, attendance-without-payroll ${attNoPay}`);

  console.log('== SALARY rows ==');
  for (const r of salaryRows) {
    const emp = match(r.code, r.driverNo);
    if (!emp) { salUnmatched++; problems.push(`salary unmatched: ${r.source}:${r.code}:${r.name}`); continue; }
    salMatched++;
    const pay = payByEmp.get(emp.id);
    if (!pay) problems.push(`salary but NO payroll: ${emp.employeeId} ${emp.name} (${r.source}:${r.code})`);
  }
  console.log(`matched ${salMatched}, unmatched ${salUnmatched}`);

  console.log('== Employees with payroll but zero attendance ==');
  for (const [empId, p] of payByEmp) {
    const e = byId.get(empId);
    if (!e) { problems.push(`payroll for unknown employee ${empId}`); continue; }
    if (!(attCount.get(empId) || 0)) problems.push(`payroll with NO attendance: ${e.employeeId} ${e.name}`);
  }

  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No cross-check problems.');
}
main().catch(e => { console.error(e); process.exit(1); });
