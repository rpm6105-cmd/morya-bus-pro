'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '../../lib/context/StoreContext';
import { calculatePayroll as calcPayroll } from '../../lib/utils/payrollCalc';
import { dataService } from '../../lib/services/dataService';
import { 
  FileText, 
  Download, 
  Mail, 
  Printer, 
  Eye, 
  UserCheck, 
  Calendar,
  Building2,
  Phone,
  Globe
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function DocumentsPage() {
  const { employees, branches, attendance, selectedMonth, selectedYear } = useStore();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [docType, setDocType] = useState<'OFFER' | 'APPOINTMENT' | 'PAYSLIP'>('OFFER');
  const [isGenerating, setIsGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);
  const branch = branches.find(b => b.id === selectedEmployee?.branchId);
  const payroll = selectedEmployee && branch ? calcPayroll({
    employee: selectedEmployee,
    branch,
    attendanceRecords: (attendance[selectedEmployee.id] || {}) as Record<string, any>,
    overtimeEntries: [],
    settings: dataService.getSettings(),
    month: selectedMonth + 1,
    year: selectedYear,
  }) : null;

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  const downloadPDF = async () => {
    if (!docRef.current) return;
    setIsGenerating(true);
    
    const canvas = await html2canvas(docRef.current, {
      scale: 3,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`morya_${docType.toLowerCase()}_${selectedEmployee?.name}.pdf`);
    setIsGenerating(false);
  };

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Document Generator</h2>
        <p className="text-muted">Issue branded, legal-ready HR documentation instantly.</p>
      </header>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: '400px 1fr' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
             <h3 style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>Document Configuration</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                   <label className="text-muted" style={{ fontWeight: 700, fontSize: '0.75rem' }}>SELECT EMPLOYEE</label>
                   <select 
                      className="input" 
                      value={selectedEmpId} 
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                   >
                      <option value="">-- Choose Employee --</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-muted" style={{ fontWeight: 700, fontSize: '0.75rem' }}>DOCUMENT TYPE</label>
                   <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        className={`btn ${docType === 'OFFER' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setDocType('OFFER')}
                      ><Mail size={16} /> Offer Letter</button>
                      <button 
                         className={`btn ${docType === 'APPOINTMENT' ? 'btn-primary' : 'btn-outline'}`}
                         onClick={() => setDocType('APPOINTMENT')}
                      ><UserCheck size={16} /> Appointment Letter</button>
                      <button 
                         className={`btn ${docType === 'PAYSLIP' ? 'btn-primary' : 'btn-outline'}`}
                         onClick={() => setDocType('PAYSLIP')}
                      ><FileText size={16} /> Monthly Payslip</button>
                   </div>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                   <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PREVIEW SUMMARY</p>
                   {selectedEmployee ? (
                     <div style={{ fontSize: '0.8rem' }}>
                        <p><strong>Employee:</strong> {selectedEmployee.name}</p>
                        <p><strong>DEPOT:</strong> {branch?.name}</p>
                        <p><strong>PERIOD:</strong> {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}</p>
                     </div>
                   ) : <p style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Select employee to load data...</p>}
                </div>

                <button 
                   className="btn btn-accent" 
                   disabled={!selectedEmployee || isGenerating}
                   style={{ height: '50px' }}
                   onClick={downloadPDF}
                >
                   {isGenerating ? 'Rendering PDF...' : <><Download size={18} /> Download Branded PDF</>}
                </button>
             </div>
          </div>
        </div>

        {/* Preview Area */}
        <div style={{ background: '#94a3b8', padding: '3rem', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center', overflowY: 'auto', maxHeight: '1000px' }}>
           <div 
             ref={docRef}
             style={{ 
               width: '210mm', 
               minHeight: '297mm', 
               background: 'white', 
               padding: '2.5rem',
               boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
               position: 'relative',
               color: '#1e293b'
             }}
           >
               {/* Letterhead Header */}
               {docType === 'PAYSLIP' ? (
                 <div style={{ background: '#0F4C81', color: '#fff', borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                     <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#fff', color: '#0F4C81', fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MB</div>
                     <div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>MORYA BUS SERVICES</div>
                       <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{branch ? `${branch.name}, ${branch.city}, ${branch.state}` : 'Morya Bus Services'}</div>
                       <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>www.moryabuses.com</div>
                     </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '1.9rem', fontWeight: 700, letterSpacing: '1px' }}>PAY SLIP</div>
                     <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Salary Month : {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}</div>
                   </div>
                 </div>
               ) : (
                 <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div>
                     <h1 style={{ color: '#0f172a', fontSize: '2rem', marginBottom: '0.25rem' }}>MORYA BUS DEPOT</h1>
                     <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>PREMIUM TRANSPORTATION SERVICES</p>
                   </div>
                   <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                     <p style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}><Building2 size={12} /> Depot Road, Mumbai, MH</p>
                     <p style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}><Phone size={12} /> +91 98765 43210</p>
                     <p style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}><Globe size={12} /> www.moryabus.com</p>
                   </div>
                 </div>
               )}

              {/* Document Content */}
              {selectedEmployee && branch ? (
                <>
                  <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                     <p><strong>Ref:</strong> MBD/HR/{docType}/{selectedEmployee.id}</p>
                     <p><strong>Date:</strong> {format(new Date(), 'do MMMM yyyy')}</p>
                  </div>

                  {docType !== 'PAYSLIP' && (
                    <h2 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '2.5rem', color: '#0f172a' }}>
                      {docType.replace('_', ' ')}
                    </h2>
                  )}

                  {docType === 'PAYSLIP' && payroll ? (
                    <div style={{ fontSize: '0.85rem' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                          <tbody>
                             <tr>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb', width: '25%' }}>Employee Name</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb', width: '25%' }}>{selectedEmployee.name}</td>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb', width: '25%' }}>Employee ID</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb', width: '25%' }}>{selectedEmployee.id}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Department</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.department}</td>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Designation</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.designation}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Date of Joining</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{format(new Date(`${selectedEmployee.joiningDate}T00:00:00`), 'dd-MMM-yyyy')}</td>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Pay Date</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{format(new Date(selectedYear, selectedMonth + 1, 0), 'dd-MMM-yyyy')}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Bank</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.bankName || 'N/A'}</td>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>Account No.</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.bankAccount && selectedEmployee.bankAccount.length > 4 ? `XXXXXX${selectedEmployee.bankAccount.slice(-4)}` : (selectedEmployee.bankAccount || 'N/A')}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>PAN</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.panNumber || 'N/A'}</td>
                                <td style={{ padding: '0.5rem', background: '#f5f7fb', color: '#64748b', fontWeight: 600, border: '1px solid #dde4eb' }}>UAN</td>
                                <td style={{ padding: '0.5rem', color: '#1e293b', border: '1px solid #dde4eb' }}>{selectedEmployee.pfUanNumber || 'N/A'}</td>
                             </tr>
                          </tbody>
                       </table>

                       <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                          <thead>
                             <tr>
                                <th style={{ padding: '0.6rem', textAlign: 'left', background: '#f5f7fb', color: '#0f172a', fontWeight: 600, border: '1px solid #dde4eb' }}>Earnings</th>
                                <th style={{ padding: '0.6rem', textAlign: 'left', background: '#f5f7fb', color: '#0f172a', fontWeight: 600, border: '1px solid #dde4eb' }}>Amount</th>
                                <th style={{ padding: '0.6rem', textAlign: 'left', background: '#f5f7fb', color: '#0f172a', fontWeight: 600, border: '1px solid #dde4eb' }}>Deductions</th>
                                <th style={{ padding: '0.6rem', textAlign: 'left', background: '#f5f7fb', color: '#0f172a', fontWeight: 600, border: '1px solid #dde4eb' }}>Amount</th>
                             </tr>
                          </thead>
                          <tbody>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>Basic Salary</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>₹{payroll.earnedBasic.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.pfDeduction > 0 ? 'Provident Fund' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.pfDeduction > 0 ? `₹${payroll.pfDeduction.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>House Rent Allowance</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>₹{payroll.earnedHra.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.ptDeduction > 0 ? 'Professional Tax' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.ptDeduction > 0 ? `₹${payroll.ptDeduction.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>Conveyance Allowance</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>₹{payroll.earnedConveyance.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.esicDeduction > 0 ? 'ESIC' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.esicDeduction > 0 ? `₹${payroll.esicDeduction.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>Other Allowances</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>₹{payroll.earnedAllowances.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.tdsDeduction > 0 ? 'Income Tax' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.tdsDeduction > 0 ? `₹${payroll.tdsDeduction.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.overtimeAmount > 0 ? `Overtime (${payroll.overtimeHours}h / ${payroll.overtimeDays}d)` : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.overtimeAmount > 0 ? `₹${payroll.overtimeAmount.toLocaleString()}` : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.lopDeduction > 0 ? 'LOP Deduction' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.lopDeduction > 0 ? `₹${payroll.lopDeduction.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.incentive > 0 ? 'Incentive' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.incentive > 0 ? `₹${payroll.incentive.toLocaleString()}` : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb' }}>{payroll.driverIncentive > 0 ? 'Driver Incentive' : ''}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right' }}>{payroll.driverIncentive > 0 ? `₹${payroll.driverIncentive.toLocaleString()}` : ''}</td>
                             </tr>
                             <tr style={{ background: '#fafafa' }}>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', fontWeight: 700 }}>Gross Earnings</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right', fontWeight: 700 }}>₹{payroll.totalEarnings.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', fontWeight: 700 }}>Total Deductions</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #dde4eb', textAlign: 'right', fontWeight: 700 }}>₹{payroll.totalDeductions.toLocaleString()}</td>
                             </tr>
                          </tbody>
                       </table>

                       <div style={{ background: '#0F4C81', color: '#fff', borderRadius: '6px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                          <div>
                             <div style={{ fontSize: '1rem', fontWeight: 700 }}>NET PAY</div>
                             <div style={{ fontSize: '0.75rem', opacity: 0.95, marginTop: '2px' }}>Rupees {numberToWords(payroll.netSalary)} Only</div>
                          </div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>₹{payroll.netSalary.toLocaleString()}</div>
                       </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
                       <p>To,</p>
                       <p><strong>{selectedEmployee.name}</strong></p>
                       <p>{branch.name}</p>
                       <br />
                       <p>Dear {selectedEmployee.name.split(' ')[0]},</p>
                       <br />
                       <p>
                          {docType === 'OFFER' ? 
                            `We are delighted to offer you the position at Morya Bus Depot. With reference to your interview, we are pleased to offer you a monthly salary of INR ${selectedEmployee.salary.toLocaleString()}. We look forward to your contributions at our ${branch.name}.` : 
                            `We are pleased to confirm your appointment as a full-time staff member at Morya Bus Depot. Your expertise in ${selectedEmployee.department} will be a valuable asset to our operations. This appointment is effective from ${selectedEmployee.joiningDate}.`}
                       </p>
                       <p>
                          Our organization prides itself on fleet excellence and employee welfare. We trust your skills will help us reach new milestones in the Maharashtra transport sector.
                       </p>
                    </div>
                  )}

                  {/* Signature Section */}
                  {docType === 'PAYSLIP' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem', fontSize: '0.8rem', color: '#475569' }}>
                       <div style={{ textAlign: 'center', width: '180px' }}>
                          <div style={{ borderTop: '1px solid #334155', marginBottom: '0.5rem', height: '2.5rem' }} />
                          Employer Signature
                       </div>
                       <div style={{ textAlign: 'center', width: '180px' }}>
                          <div style={{ borderTop: '1px solid #334155', marginBottom: '0.5rem', height: '2.5rem' }} />
                          Employee Signature
                       </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                       <div>
                          <p style={{ fontSize: '1.25rem', fontFamily: 'serif', fontStyle: 'italic', marginBottom: '0.25rem' }}>Rajesh More</p>
                          <div style={{ width: '150px', height: '1px', background: '#0f172a', marginBottom: '0.5rem' }} />
                          <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>HR MANAGER</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Morya Bus Depot Operations Hub</p>
                       </div>
                       <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '100px', height: '100px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                             COMPANY STAMP
                          </div>
                          <p style={{ fontSize: '0.7rem', fontWeight: 600 }}>AUTHORIZED SEAL</p>
                       </div>
                    </div>
                  )}

                  <p style={{ position: 'absolute', bottom: '2.5rem', left: '2.5rem', right: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#cbd5e1', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    {docType === 'PAYSLIP' ? 'This is a computer-generated payslip and does not require a physical signature.' : 'This is a computer-generated document and is legally binding as per the terms of employment at Morya Bus Depot.'}
                  </p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                   <FileText size={100} style={{ opacity: 0.1 }} />
                   <p style={{ fontWeight: 700, fontSize: '1.5rem', marginTop: '1rem' }}>PREVIEW MODE</p>
                   <p>Configure employee and document type to render.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
