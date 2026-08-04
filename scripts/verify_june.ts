import { readFileSync } from 'fs';
import { parseSalaryWorkbook } from '../app/lib/utils/juneParser';

const URL = 'https://tekdmmkkqxjjolzvvnor.supabase.co';
const KEY = process.argv[2];
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function get(path: string) { const r = await fetch(URL + path, { headers: H }); if (!r.ok) throw new Error(await r.text()); return r.json(); }

async function main() {
  const payroll = await get('/rest/v1/payroll?select=*&month=eq.Jun&year=eq.2026&limit=100000') as any[];
  const employees = await get('/rest/v1/employees?select=id,employeeId,name,subDepotCategory,driverNumber&limit=2000') as any[];
  const empById = new Map(employees.map((e: any) => [e.id, e]));

  const groups: Record<string, { count: number; net: number; gross: number }> = { '9 MTR': { count: 0, net: 0, gross: 0 }, '12 MTR': { count: 0, net: 0, gross: 0 }, STAFF: { count: 0, net: 0, gross: 0 } };
  const noSheet = payroll.filter((p: any) => {
    const e = empById.get(p.employeeId);
    if (!e) return false;
    const isStaff = e.subDepotCategory === 'STAFF';
    const src = isStaff ? 'STAFF' : e.employeeId.startsWith('MTPL/12D') ? '12 MTR' : '9 MTR';
    groups[src].count++;
    groups[src].net += p.netSalary;
    groups[src].gross += p.grossSalary;
    return false;
  });
  void noSheet;

  const expected = { '9 MTR': 1848927, '12 MTR': 882122, STAFF: 215462 };
  console.log('=== DB payroll (Jun 2026) by source ===');
  for (const [src, g] of Object.entries(groups)) {
    const diff = g.net - expected[src as keyof typeof expected];
    const expectedEntries = src === 'STAFF' ? 10 : src === '12 MTR' ? 38 : 83;
    console.log(`${src}: ${g.count} entries | net ₹${g.net.toLocaleString()} | sheet ₹${expected[src as keyof typeof expected].toLocaleString()} | diff ₹${diff.toLocaleString()} | entries ${g.count}/${expectedEntries}`);
  }
  console.log(`TOTAL: net ₹${(groups['9 MTR'].net + groups['12 MTR'].net + groups.STAFF.net).toLocaleString()}`);

  // Which 12MTR DB entries exist vs the 38 sheet rows?
  const DIR = '/Users/rohithpm/Downloads/Kalakilla Dpeot (Dharavi)/';
  const load = (f: string) => readFileSync(DIR + f).buffer.slice(0);
  const salRows = [
    ...await parseSalaryWorkbook(load('1. 9 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx'), '9 MTR'),
    ...await parseSalaryWorkbook(load('2. 12 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx'), '12 MTR'),
    ...await parseSalaryWorkbook(load('3. KKD STAFF ATTN & SALARY - JUNE 2026.xlsx'), 'STAFF'),
  ];
  const sheetByEmp = new Map<string, any>();
  const norm = (s: string) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const byDriver = new Map<string, any>();
  const byNameOnly = new Map<string, any>();
  for (const r of salRows) {
    if (r.totalDays === 0 && r.net === 0) continue;
    if (r.driverNo) byDriver.set(String(r.driverNo).trim(), r);
    const nk = norm(r.name);
    if (nk && !byNameOnly.has(nk)) byNameOnly.set(nk, r);
  }
  for (const p of payroll) {
    const emp = empById.get(p.employeeId);
    if (!emp) continue;
    let row = byDriver.get(String(emp.driverNumber || '').trim());
    if (!row) row = byNameOnly.get(norm(emp.name));
    if (row) sheetByEmp.set(emp.id, row);
  }

  let match = 0, checked = 0;
  const mismatches: string[] = [];
  for (const p of payroll) {
    const emp = empById.get(p.employeeId);
    if (!emp) continue;
    const sheet = sheetByEmp.get(p.employeeId);
    if (!sheet) { mismatches.push(`${emp.employeeId} ${emp.name}: no sheet row (computed)`); continue; }
    checked++;
    const sheetNet = Math.round(sheet.net);
    if (Math.abs(sheetNet - p.netSalary) <= 1) match++;
    else mismatches.push(`${emp.employeeId} ${emp.name}: stored ₹${p.netSalary} vs sheet ₹${sheetNet}`);
  }
  console.log(`=== net comparison vs sheets: ${match}/${checked} exact ===`);
  mismatches.slice(0, 15).forEach(m => console.log('  ', m));
}
main().catch(e => { console.error(e); process.exit(1); });
