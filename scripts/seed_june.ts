import { readFileSync } from 'fs';
import { parseSalaryWorkbook, parseAttendanceWorkbook, SheetSource, SalaryRow, AttendanceRow } from '../app/lib/utils/juneParser';
import { ATTENDANCE_STATUS_MAP } from '../app/lib/types';

const URL = 'https://tekdmmkkqxjjolzvvnor.supabase.co';
const KEY = process.argv[2];
if (!KEY) { console.error('pass anon key as argv[2]'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function get(path: string) { const r = await fetch(URL + path, { headers: H }); if (!r.ok) throw new Error(`GET ${path} -> ${r.status}: ${await r.text()}`); return r.json(); }
async function post(path: string, body: any, headers?: any) { const r = await fetch(URL + path, { method: 'POST', headers: { ...H, ...(headers || {}) }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`POST ${path} -> ${r.status}: ${await r.text()}`); const t = await r.text(); return t ? JSON.parse(t) : null; }
async function patch(path: string, body: any) { const r = await fetch(URL + path, { method: 'PATCH', headers: H, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`PATCH ${path} -> ${r.status}: ${await r.text()}`); const t = await r.text(); return t ? JSON.parse(t) : null; }

const DIR = '/Users/rohithpm/Downloads/Kalakilla Dpeot (Dharavi)/';
const load = (f: string) => readFileSync(DIR + f).buffer.slice(0);

const MONTH = 6;
const YEAR = 2026;
const MONTH_LABEL = 'Jun';

function norm(s: string) { return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim(); }

interface Emp { id: string; employeeId: string; name: string; branchId: string; subDepotCategory: string; driverNumber?: string; salary: number; }

async function main() {
  const salFiles: [string, SheetSource][] = [
    ['1. 9 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx', '9 MTR'],
    ['2. 12 MTR DRIVER ATTN & SALARY - JUNE 2026.xlsx', '12 MTR'],
    ['3. KKD STAFF ATTN & SALARY - JUNE 2026.xlsx', 'STAFF'],
  ];
  const salaryRows: SalaryRow[] = [];
  for (const [f, src] of salFiles) salaryRows.push(...await parseSalaryWorkbook(load(f), src));

  let employees = await get('/rest/v1/employees?select=id,employeeId,name,branchId,subDepotCategory,driverNumber,salary&limit=2000') as Emp[];
  console.log('employees in DB:', employees.length);

  const buildMaps = (list: Emp[]) => {
    const byCode = new Map<string, Emp>();
    const byName = new Map<string, Emp>();
    const byPNo = new Map<string, Emp>();
    const byFirstLast = new Map<string, Emp>();
    const firstLastCount = new Map<string, number>();
    list.forEach(e => {
      byCode.set(e.employeeId, e);
      const key = norm(e.name);
      if (key && !byName.has(key)) byName.set(key, e);
      if (e.driverNumber) byPNo.set(String(e.driverNumber).trim(), e);
      const tokens = norm(e.name).split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const fl = tokens[0] + ' ' + tokens[tokens.length - 1];
        firstLastCount.set(fl, (firstLastCount.get(fl) || 0) + 1);
        if (!byFirstLast.has(fl)) byFirstLast.set(fl, e);
      }
    });
    const matchEmp = (code: string, name: string, driverNo?: string): Emp | null => {
      const direct = (driverNo ? byPNo.get(String(driverNo).trim()) : null) || byCode.get(code) || byName.get(norm(name));
      if (direct) return direct;
      const tokens = norm(name).split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const fl = tokens[0] + ' ' + tokens[tokens.length - 1];
        if (firstLastCount.get(fl) === 1) return byFirstLast.get(fl) || null;
      }
      return null;
    };
    return { byCode, byName, byPNo, matchEmp };
  };
  let maps = buildMaps(employees);

  // ---------- Ensure missing STAFF employees from salary rows ----------
  const created: string[] = [];
  for (const row of salaryRows) {
    if (row.source !== 'STAFF') continue;
    if (maps.matchEmp(row.code, row.name)) continue;
    const empRow = {
      id: `emp-june-${row.code.replace(/\//g, '-').toLowerCase()}`,
      employeeId: row.code,
      masterEmployeeId: row.code,
      name: row.name,
      department: 'Office Staff',
      designation: 'Staff',
      branchId: 'depot-001',
      subDepotCategory: 'STAFF',
      salary: row.master.gross,
      grossSalary: row.master.gross,
      basicSalary: row.master.basic,
      status: 'ACTIVE',
    };
    await post('/rest/v1/employees', empRow);
    created.push(`${row.code}:${row.name}`);
  }
  if (created.length) {
    console.log('created missing staff:', created);
    employees = await get('/rest/v1/employees?select=id,employeeId,name,branchId,subDepotCategory,driverNumber,salary&limit=2000') as Emp[];
    maps = buildMaps(employees);
  }

  // ---------- ATTENDANCE IMPORT ----------
  const attFiles: [string, SheetSource][] = salFiles;
  const attRows: AttendanceRow[] = [];
  for (const [f, src] of attFiles) attRows.push(...await parseAttendanceWorkbook(load(f), src, MONTH, YEAR));

  const attUnmatched: string[] = [];
  const attBatch: any[] = [];
  const seenAttEmp = new Set<string>();
  const desigByEmp = new Map<string, string>();
  for (const row of attRows) {
    const emp = maps.matchEmp(row.code, row.name, row.driverNo);
    if (!emp) { attUnmatched.push(`${row.source}:${row.code}:${row.name}:${row.driverNo}`); continue; }
    if (seenAttEmp.has(emp.id)) { attUnmatched.push(`${row.source}:${row.code}:${row.name} -> DUPLICATE employee ${emp.employeeId}`); continue; }
    seenAttEmp.add(emp.id);
    if (row.designation && row.source === 'STAFF') desigByEmp.set(emp.id, row.designation);
    for (const [date, status] of Object.entries(row.dayStatuses)) {
      attBatch.push({ employeeId: emp.id, date, status, isPaid: ATTENDANCE_STATUS_MAP[status].paid, depotId: emp.branchId });
    }
  }
  await fetch(URL + '/rest/v1/attendance?date=gte.2026-06-01&date=lte.2026-06-30', { method: 'DELETE', headers: H });
  for (let i = 0; i < attBatch.length; i += 1000) {
    await post(`/rest/v1/attendance?on_conflict=employeeId,date`, attBatch.slice(i, i + 1000), { Prefer: 'resolution=ignore-duplicates' });
  }
  console.log(`attendance: ${attRows.length} sheet rows, ${attBatch.length} day-records inserted, ${attUnmatched.length} unmatched`);
  if (attUnmatched.length) console.log('attendance unmatched (skipped):', attUnmatched);

  const desigPatches = [...desigByEmp.entries()].map(([id, designation]) => ({ id, designation }));
  for (let i = 0; i < desigPatches.length; i += 100) {
    await Promise.all(desigPatches.slice(i, i + 100).map(p => patch(`/rest/v1/employees?id=eq.${p.id}`, { designation: p.designation })));
  }
  console.log(`staff designations updated: ${desigPatches.length} (${[...desigByEmp.values()].join('; ')})`);

  // ---------- SALARY IMPORT ----------
  const existingMasters = await get('/rest/v1/salary_masters?select=id,employeeId,effectiveFrom&limit=5000') as any[];
  const existingPayroll = await get('/rest/v1/payroll?select=id,employeeId,month,year&limit=5000') as any[];
  const existingByEmpEff = new Map(existingMasters.map((m: any) => [`${m.employeeId}|${m.effectiveFrom}`, m]));

  const masterUpserts: any[] = [];
  const masterPatches: any[] = [];
  const empSalaryPatches: any[] = [];
  const payrollInserts: any[] = [];
  const now = new Date().toISOString();
  let matched = 0;
  const unmatched: string[] = [];
  const skippedNoData: string[] = [];
  let netTotal = 0, compsTotal = 0;
  const matchedById = new Map<string, string[]>();

  for (const row of salaryRows) {
    const emp = maps.matchEmp(row.code, row.name, row.driverNo);
    if (!emp) { unmatched.push(`${row.source}:${row.code}:${row.name}`); continue; }
    matched++;
    const prev = matchedById.get(emp.id) || [];
    prev.push(`${row.source}:${row.code}:${row.name}`);
    matchedById.set(emp.id, prev);

    if (row.totalDays === 0 && row.net === 0) { skippedNoData.push(`${row.source}:${row.code}:${row.name}`); continue; }

    const effKey = `${emp.id}|2026-06`;
    const otRate = row.source === 'STAFF' ? 108.33 : 86;
    const masterRow = {
      id: existingByEmpEff.get(effKey)?.id || `sm-june-${emp.id}`,
      employeeId: emp.id,
      effectiveFrom: '2026-06',
      basic: row.master.basic,
      da: row.master.da,
      hra: row.master.hra,
      conveyance: row.master.conveyance,
      washing: row.master.washing,
      medical: row.master.medical,
      otherAllowance: row.master.otherAllowance,
      gross: row.master.gross,
      perDayDivisor: 30,
      otRatePerHour: otRate,
      source: row.source === 'STAFF' ? 'STAFF' : row.source,
    };
    if (existingByEmpEff.get(effKey)) masterPatches.push({ ...masterRow, updatedAt: now });
    else masterUpserts.push({ ...masterRow, createdAt: now, updatedAt: now });

    empSalaryPatches.push({ id: emp.id, salary: row.master.gross, grossSalary: row.master.gross, basicSalary: row.master.basic });

    const grossComps = Math.round(row.earned.basic + row.earned.hra + row.earned.conveyance + row.earned.washing + row.earned.medical + row.earned.other);
    const overtimeAmount = Math.round(row.otDaysPay + row.otHoursPay);
    const totalEarnings = Math.round(grossComps + overtimeAmount + row.food);
    const totalDeductions = row.deductions.totalDed || Math.round(row.deductions.pf + row.deductions.esic + row.deductions.pt + row.deductions.mlwf + row.deductions.other);
    const net = row.net > 0 ? row.net : (totalEarnings - totalDeductions + row.deductions.refund);

    const existing = existingPayroll.find((p: any) => p.employeeId === emp.id && p.month === MONTH_LABEL && p.year === YEAR);
    const ratioDays = row.source === 'STAFF' ? row.payDays : row.totalDays;

    const entry: any = {
      id: existing?.id || `pay-june-${emp.id}`,
      employeeId: emp.id,
      month: MONTH_LABEL,
      year: YEAR,
      depotId: emp.branchId,
      basicSalary: row.earned.basic,
      hra: row.earned.hra,
      conveyance: row.earned.conveyance,
      washing: row.earned.washing,
      medical: row.earned.medical,
      otherAllowances: row.earned.other,
      grossSalary: grossComps,
      presentDays: Math.round(row.presentDays),
      paidLeaveDays: 0,
      holidayDays: 0,
      weekOffDays: Math.round(row.source === 'STAFF' ? 0 : row.weekoff),
      absentDays: Math.round(row.source === 'STAFF' ? 0 : row.absent),
      lopDays: 0,
      totalDays: Math.round(ratioDays),
      extraDays: Math.round(row.extra),
      perDay: Math.round(row.master.gross / 30 * 100) / 100,
      lopDeduction: 0,
      overtimeHours: row.otHours || 0,
      overtimeDays: row.extra,
      overtimeType: row.extra > 0 ? 'FULL_DAY' : (row.otHours > 0 ? 'HOURLY' : null),
      overtimeAmount,
      foodIncentive: row.food,
      driverIncentive: 0,
      incentive: 0,
      totalEarnings,
      pfDeduction: row.deductions.pf,
      esicDeduction: row.deductions.esic,
      tdsDeduction: 0,
      ptDeduction: row.deductions.pt,
      mlwfDeduction: row.deductions.mlwf,
      otherDeductions: row.deductions.other,
      refundAmount: row.deductions.refund,
      totalDeductions,
      netSalary: net,
      status: 'DRAFT',
      processedBy: 'june-import',
      processedAt: now,
    };
    payrollInserts.push(entry);
    netTotal += net;
    compsTotal += grossComps;
  }

  console.log(`salary: ${salaryRows.length} sheet rows, ${matched} matched, ${unmatched.length} unmatched, ${skippedNoData.length} skipped(no data)`);
  for (const [empId, rows] of matchedById) if (rows.length > 1) console.log(`DUPLICATE match ${empId}:`, rows);
  if (unmatched.length) console.log('unmatched:', unmatched);
  if (skippedNoData.length) console.log('skipped(no data):', skippedNoData);

  for (let i = 0; i < masterUpserts.length; i += 500) await post('/rest/v1/salary_masters?on_conflict=id', masterUpserts.slice(i, i + 500), { Prefer: 'resolution=merge-duplicates' });
  for (const m of masterPatches) await patch(`/rest/v1/salary_masters?id=eq.${m.id}`, { ...m, id: undefined });
  console.log('salary_masters upserted:', masterUpserts.length, 'patched:', masterPatches.length);

  for (let i = 0; i < empSalaryPatches.length; i += 200) {
    await Promise.all(empSalaryPatches.slice(i, i + 200).map(p => patch(`/rest/v1/employees?id=eq.${p.id}`, { salary: p.salary, grossSalary: p.grossSalary, basicSalary: p.basicSalary })));
  }
  console.log('employee salary fields updated:', empSalaryPatches.length);

  for (let i = 0; i < payrollInserts.length; i += 500) await post('/rest/v1/payroll?on_conflict=id', payrollInserts.slice(i, i + 500), { Prefer: 'resolution=merge-duplicates' });
  console.log('payroll entries upserted:', payrollInserts.length);
  console.log(`June net total: ₹${netTotal.toLocaleString()} | June comps gross total: ₹${compsTotal.toLocaleString()}`);
}
main().catch(e => { console.error(e); process.exit(1); });
