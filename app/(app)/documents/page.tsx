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

              {/* Document Content */}
              {selectedEmployee && branch ? (
                <>
                  <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                     <p><strong>Ref:</strong> MBD/HR/{docType}/{selectedEmployee.id}</p>
                     <p><strong>Date:</strong> {format(new Date(), 'do MMMM yyyy')}</p>
                  </div>

                  <h2 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '2.5rem', color: '#0f172a' }}>
                    {docType === 'PAYSLIP' ? `SALARY SLIP - ${format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}` : docType.replace('_', ' ')}
                  </h2>

                  {docType === 'PAYSLIP' && payroll ? (
                    <div style={{ fontSize: '0.9rem' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
                          <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                             <p style={{ fontWeight: 700, borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>EMPLOYEE DETAILS</p>
                             <p>Name: {selectedEmployee.name}</p>
                             <p>Employee ID: {selectedEmployee.id}</p>
                             <p>Department: {selectedEmployee.department}</p>
                             <p>Depot: {branch.name}</p>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                             <p style={{ fontWeight: 700, borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>PAYROLL INFO</p>
                             <p>Bank: Morya Corporate Bank</p>
                             <p>Month: {format(new Date(selectedYear, selectedMonth), 'MMMM')}</p>
                             <p>Year: {selectedYear}</p>
                             <p>Status: Disbursed</p>
                          </div>
                       </div>

                       <table style={{ border: '1px solid #0f172a', marginBottom: '1.5rem' }}>
                          <thead style={{ background: '#f8fafc' }}>
                             <tr>
                                <th style={{ color: '#0f172a' }}>Earnings</th>
                                <th style={{ color: '#0f172a' }}>Amount</th>
                                <th style={{ color: '#0f172a' }}>Deductions</th>
                                <th style={{ color: '#0f172a' }}>Amount</th>
                             </tr>
                          </thead>
                          <tbody>
                             <tr>
                                <td>Basic Salary</td>
                                <td>₹{payroll.earnedBasic.toLocaleString()}</td>
                                <td>Provident Fund (PF)</td>
                                <td>₹{payroll.pfDeduction.toLocaleString()}</td>
                             </tr>
                             <tr>
                                <td>HRA</td>
                                <td>₹{payroll.earnedHra.toLocaleString()}</td>
                                <td>ESIC</td>
                                <td>₹{payroll.esicDeduction.toLocaleString()}</td>
                             </tr>
                             <tr>
                                <td>Conveyance</td>
                                <td>₹{payroll.earnedConveyance.toLocaleString()}</td>
                                <td>TDS</td>
                                <td>₹{payroll.tdsDeduction.toLocaleString()}</td>
                             </tr>
                             <tr>
                                <td>Other Allowances</td>
                                <td>₹{payroll.earnedAllowances.toLocaleString()}</td>
                                <td>Professional Tax (PT)</td>
                                <td>₹{payroll.ptDeduction.toLocaleString()}</td>
                             </tr>
                             <tr>
                                <td>Overtime ({payroll.overtimeHours}h / {payroll.overtimeDays}d)</td>
                                <td>₹{payroll.overtimeAmount.toLocaleString()}</td>
                                <td>Loss of Pay (LOP)</td>
                                <td>₹{payroll.lopDeduction.toLocaleString()}</td>
                             </tr>
                             <tr>
                                <td>Incentive</td>
                                <td>₹{payroll.incentive.toLocaleString()}</td>
                                <td>Driver Incentive</td>
                                <td>₹{payroll.driverIncentive.toLocaleString()}</td>
                             </tr>
                             <tr style={{ fontWeight: 700, borderTop: '2px solid #0f172a' }}>
                                <td><strong>GROSS EARNINGS</strong></td>
                                <td><strong>₹{payroll.totalEarnings.toLocaleString()}</strong></td>
                                <td><strong>TOTAL DEDUCTIONS</strong></td>
                                <td><strong>₹{payroll.totalDeductions.toLocaleString()}</strong></td>
                             </tr>
                          </tbody>
                       </table>

                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                             <p style={{ fontWeight: 700 }}>Present Days</p>
                             <p>{payroll.presentDays} / {payroll.daysInMonth}</p>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                             <p style={{ fontWeight: 700 }}>Absent / LOP</p>
                             <p>{payroll.absentDays} / {payroll.lopDays}</p>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                             <p style={{ fontWeight: 700 }}>Paid / Holiday / Week Off</p>
                             <p>{payroll.paidLeaveDays} / {payroll.holidayDays} / {payroll.weekOffDays}</p>
                          </div>
                       </div>

                       <div style={{ background: '#ecfdf5', borderLeft: '5px solid #10b981', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                             <h3 style={{ color: '#065f46', fontSize: '1rem' }}>NET SALARY PAYABLE</h3>
                             <p style={{ fontSize: '0.75rem', color: '#065f46' }}>Disbursed via Direct Bank Transfer</p>
                          </div>
                          <h2 style={{ color: '#065f46', fontSize: '2.25rem' }}>₹{payroll.netSalary.toLocaleString()}</h2>
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

                  <p style={{ position: 'absolute', bottom: '2.5rem', left: '2.5rem', right: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#cbd5e1', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    This is a computer-generated document and is legally binding as per the terms of employment at Morya Bus Depot.
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
