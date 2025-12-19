export interface PayslipData {
  country: 'Qatar' | 'Saudi Arabia' | 'India';
  currency: 'QAR' | 'SAR' | 'INR';

  companyName: string;
  companyAddress?: string;
  establishmentId?: string;

  employeeName: string;
  employeeCode: string;
  employeeId: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  iban?: string;

  payPeriod: string;
  paymentDate?: string;
  workingDays: number;
  daysPresent: number;
  daysAbsent: number;

  basicSalary: number;
  housingAllowance: number;
  foodAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  utilityAllowance: number;
  otherAllowances: number;

  overtimeHours?: number;
  overtimeAmount?: number;
  bonus?: number;

  gosiEmployeeContribution?: number;
  gosiEmployerContribution?: number;
  absenceDeduction: number;
  loanDeduction: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  otherDeductions: number;

  grossSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
}

export function generatePayslipHTML(data: PayslipData): string {
  const earnings = [
    { label: 'Basic Salary', amount: data.basicSalary },
    { label: 'Housing Allowance', amount: data.housingAllowance },
    { label: 'Food Allowance', amount: data.foodAllowance },
    { label: 'Transport Allowance', amount: data.transportAllowance },
    { label: 'Mobile Allowance', amount: data.mobileAllowance },
    { label: 'Utility Allowance', amount: data.utilityAllowance },
    { label: 'Other Allowances', amount: data.otherAllowances },
  ].filter(item => item.amount > 0);

  if (data.overtimeAmount && data.overtimeAmount > 0) {
    earnings.push({
      label: `Overtime (${data.overtimeHours || 0} hrs)`,
      amount: data.overtimeAmount
    });
  }

  if (data.bonus && data.bonus > 0) {
    earnings.push({ label: 'Bonus', amount: data.bonus });
  }

  const deductions = [];

  if (data.gosiEmployeeContribution && data.gosiEmployeeContribution > 0) {
    deductions.push({
      label: 'GOSI (Employee)',
      amount: data.gosiEmployeeContribution
    });
  }

  if (data.absenceDeduction > 0) {
    deductions.push({ label: 'Absence Deduction', amount: data.absenceDeduction });
  }
  if (data.loanDeduction > 0) {
    deductions.push({ label: 'Loan Repayment', amount: data.loanDeduction });
  }
  if (data.advanceDeduction > 0) {
    deductions.push({ label: 'Salary Advance', amount: data.advanceDeduction });
  }
  if (data.penaltyDeduction > 0) {
    deductions.push({ label: 'Penalty', amount: data.penaltyDeduction });
  }
  if (data.otherDeductions > 0) {
    deductions.push({ label: 'Other Deductions', amount: data.otherDeductions });
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${data.employeeName} - ${data.payPeriod}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .payslip {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }

    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      padding: 30px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-block h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 15px;
      letter-spacing: 0.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .info-row .label { color: #6b7280; }
    .info-row .value { font-weight: 600; color: #1f2937; }

    .salary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .earnings, .deductions {
      padding: 30px;
    }
    .earnings {
      border-right: 2px solid #e5e7eb;
      background: #f9fafb;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .deductions .section-title {
      border-bottom-color: #ef4444;
    }
    .item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      border-bottom: 1px solid #e5e7eb;
    }
    .item .label { color: #4b5563; }
    .item .amount { font-weight: 600; color: #1f2937; }
    .item:last-child { border-bottom: none; }

    .total {
      padding: 15px 0;
      font-size: 16px;
      font-weight: 700;
      border-top: 2px solid #1f2937;
      margin-top: 10px;
    }
    .earnings .total { color: #059669; }
    .deductions .total { color: #dc2626; }

    .net-salary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .net-salary h2 {
      font-size: 14px;
      text-transform: uppercase;
      opacity: 0.9;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .net-salary .amount {
      font-size: 42px;
      font-weight: 700;
    }
    .net-salary .words {
      margin-top: 10px;
      font-size: 14px;
      opacity: 0.9;
      font-style: italic;
    }

    .footer {
      padding: 30px;
      text-align: center;
      background: #f9fafb;
      border-top: 2px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .footer .note {
      margin-top: 15px;
      font-size: 11px;
      color: #9ca3af;
      font-style: italic;
    }

    @media print {
      body { padding: 0; background: white; }
      .payslip { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <h1>${data.companyName}</h1>
      <p>${data.country} | ${data.establishmentId ? 'Est. ID: ' + data.establishmentId : ''}</p>
      <p style="margin-top: 15px; font-size: 18px; font-weight: 600;">SALARY SLIP</p>
    </div>

    <div class="info-section">
      <div class="info-block">
        <h3>Employee Information</h3>
        <div class="info-row">
          <span class="label">Name:</span>
          <span class="value">${data.employeeName}</span>
        </div>
        <div class="info-row">
          <span class="label">Employee Code:</span>
          <span class="value">${data.employeeCode}</span>
        </div>
        ${data.designation ? `
        <div class="info-row">
          <span class="label">Designation:</span>
          <span class="value">${data.designation}</span>
        </div>` : ''}
        ${data.department ? `
        <div class="info-row">
          <span class="label">Department:</span>
          <span class="value">${data.department}</span>
        </div>` : ''}
        ${data.iban ? `
        <div class="info-row">
          <span class="label">IBAN:</span>
          <span class="value">${data.iban}</span>
        </div>` : ''}
      </div>

      <div class="info-block">
        <h3>Payment Details</h3>
        <div class="info-row">
          <span class="label">Pay Period:</span>
          <span class="value">${data.payPeriod}</span>
        </div>
        ${data.paymentDate ? `
        <div class="info-row">
          <span class="label">Payment Date:</span>
          <span class="value">${data.paymentDate}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="label">Working Days:</span>
          <span class="value">${data.workingDays}</span>
        </div>
        <div class="info-row">
          <span class="label">Days Present:</span>
          <span class="value">${data.daysPresent}</span>
        </div>
        ${data.daysAbsent > 0 ? `
        <div class="info-row">
          <span class="label">Days Absent:</span>
          <span class="value">${data.daysAbsent}</span>
        </div>` : ''}
      </div>
    </div>

    <div class="salary-section">
      <div class="earnings">
        <div class="section-title">EARNINGS</div>
        ${earnings.map(item => `
          <div class="item">
            <span class="label">${item.label}</span>
            <span class="amount">${item.amount.toLocaleString()} ${data.currency}</span>
          </div>
        `).join('')}
        <div class="item total">
          <span class="label">Total Earnings</span>
          <span class="amount">${data.totalEarnings.toLocaleString()} ${data.currency}</span>
        </div>
      </div>

      <div class="deductions">
        <div class="section-title">DEDUCTIONS</div>
        ${deductions.length > 0 ? deductions.map(item => `
          <div class="item">
            <span class="label">${item.label}</span>
            <span class="amount">${item.amount.toLocaleString()} ${data.currency}</span>
          </div>
        `).join('') : `<div class="item"><span class="label">No Deductions</span><span class="amount">0.00 ${data.currency}</span></div>`}
        <div class="item total">
          <span class="label">Total Deductions</span>
          <span class="amount">${data.totalDeductions.toLocaleString()} ${data.currency}</span>
        </div>
      </div>
    </div>

    ${data.gosiEmployerContribution && data.gosiEmployerContribution > 0 ? `
    <div style="padding: 20px 30px; background: #fef3c7; border-top: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b;">
      <div class="info-row">
        <span class="label" style="color: #92400e;">GOSI Employer Contribution:</span>
        <span class="value" style="color: #92400e;">${data.gosiEmployerContribution.toLocaleString()} ${data.currency}</span>
      </div>
    </div>` : ''}

    <div class="net-salary">
      <h2>NET SALARY</h2>
      <div class="amount">${data.netSalary.toLocaleString()} ${data.currency}</div>
      <div class="words">${numberToWords(data.netSalary)} ${data.currency === 'QAR' ? 'Qatari Riyals' : data.currency === 'SAR' ? 'Saudi Riyals' : 'Indian Rupees'} Only</div>
    </div>

    <div class="footer">
      <p>This is a computer-generated payslip and does not require a signature.</p>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <p class="note">
        ${data.country === 'Qatar' ?
      'This payslip is WPS compliant as per Qatar Labour Law.' :
      data.country === 'Saudi Arabia' ?
      'This payslip is compliant with Saudi Labour Law and GOSI regulations.' :
      'This payslip is compliant with Indian Labour Law and statutory requirements (PF, ESI, PT, TDS).'}
      </p>
    </div>
  </div>
</body>
</html>
`;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  let wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  let words = '';

  if (wholePart >= 1000) {
    const thousands = Math.floor(wholePart / 1000);
    words += convertHundreds(thousands) + ' Thousand ';
    wholePart %= 1000;
  }

  words += convertHundreds(wholePart);

  if (decimalPart > 0) {
    words += ' and ' + decimalPart + '/100';
  }

  return words.trim();

  function convertHundreds(n: number): string {
    let str = '';

    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }

    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      str += teens[n - 10] + ' ';
      return str;
    }

    if (n > 0) {
      str += ones[n] + ' ';
    }

    return str;
  }
}


export function downloadPayslipHTML(data: PayslipData): void {
  // Import html2pdf dynamically
  import('html2pdf.js').then(({ default: html2pdf }) => {
    const html = generatePayslipHTML(data);

    // Create a temporary container for the HTML
    const container = document.createElement('div');
    container.innerHTML = html;

    // Style the container to be visible but not interfering
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '210mm'; // A4 width
    container.style.zIndex = '-9999';
    container.style.background = 'white';
    document.body.appendChild(container);

    // Find the payslip element to convert (not the whole HTML)
    const payslipElement = container.querySelector('.payslip') || container;

    // Configure PDF options
    const opt = {
      margin: 0,
      filename: `Payslip_${data.employeeCode}_${data.payPeriod.replace(/\s/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        width: 794, // A4 width in pixels at 96 DPI
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Small delay to ensure rendering
    setTimeout(() => {
      // Generate PDF and download
      html2pdf()
        .set(opt)
        .from(payslipElement)
        .save()
        .then(() => {
          document.body.removeChild(container);
        })
        .catch((error: Error) => {
          console.error('Error generating PDF:', error);
          document.body.removeChild(container);
          alert('Error generating PDF. Please try again.');
        });
    }, 100);
  }).catch((error) => {
    console.error('Error loading html2pdf:', error);
    alert('Error generating PDF. Please try again.');
  });
}


export function printPayslip(data: PayslipData): void {
  const html = generatePayslipHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
