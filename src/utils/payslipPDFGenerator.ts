import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PayslipData {
  companyName: string;
  companyAddress?: string;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  joiningDate?: string;
  payPeriod: string;
  payDate: string;
  paidDays: number;
  lopDays: number;
  earnings: Array<{
    name: string;
    amount: number;
    ytd?: number;
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    ytd?: number;
  }>;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
}

export async function downloadPayslipPDF(data: PayslipData): Promise<void> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 width
  document.body.appendChild(container);

  // Generate the HTML content
  const html = generatePayslipHTML(data);
  container.innerHTML = html;

  try {
    // Wait a bit for fonts and styles to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture as canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Download
    const fileName = `Payslip_${data.employeeCode}_${data.payPeriod.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

function generatePayslipHTML(data: PayslipData): string {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    if (num < 1000) return convertLessThanThousand(num);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return convertLessThanThousand(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return convertLessThanThousand(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    const crores = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return convertLessThanThousand(crores) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  };

  const amountInWords = numberToWords(Math.floor(data.netPay)) + ' Only';

  return `
    <div style="background: white; padding: 32px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="border-bottom: 1px solid black; padding-bottom: 8px; margin-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: bold; color: black; margin: 0;">${data.companyName}</h1>
        ${data.companyAddress ? `<p style="font-size: 10px; color: black; margin: 4px 0 0 0;">${data.companyAddress}</p>` : ''}
      </div>

      <!-- Title -->
      <div style="text-align: center; margin-bottom: 16px;">
        <h2 style="font-size: 14px; font-weight: bold; color: black; text-transform: uppercase; margin: 0;">
          Payslip for the month of ${data.payPeriod}
        </h2>
      </div>

      <!-- Employee Pay Summary -->
      <div style="margin-bottom: 16px;">
        <div style="background: #f3f4f6; padding: 6px 12px; font-weight: 600; color: black; font-size: 12px; border: 1px solid black;">
          EMPLOYEE PAY SUMMARY
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 12px; border: 1px solid black; border-top: none; font-size: 12px;">
          <div style="display: flex;">
            <span style="color: black; width: 128px;">Employee Name</span>
            <span style="color: black;">: ${data.employeeName}</span>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <span style="color: black; margin-right: 16px;">Employee Net Pay</span>
          </div>
          
          <div style="display: flex;">
            <span style="color: black; width: 128px;">Designation</span>
            <span style="color: black;">: ${data.designation || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <span style="font-size: 24px; font-weight: bold; color: black;">${formatCurrency(data.netPay)}</span>
          </div>
          
          <div style="display: flex;">
            <span style="color: black; width: 128px;">Date of Joining</span>
            <span style="color: black;">: ${data.joiningDate || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <span style="color: black; font-size: 10px;">Paid Days : ${data.paidDays} | LOP Days : ${data.lopDays}</span>
          </div>
          
          <div style="display: flex;">
            <span style="color: black; width: 128px;">Pay Period</span>
            <span style="color: black;">: ${data.payPeriod}</span>
          </div>
          
          <div style="display: flex;">
            <span style="color: black; width: 128px;">Pay Date</span>
            <span style="color: black;">: ${data.payDate}</span>
          </div>
        </div>
      </div>

      <!-- Earnings and Deductions -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <!-- Earnings -->
        <div>
          <div style="background: #f3f4f6; padding: 6px 12px; font-weight: 600; color: black; font-size: 12px; border: 1px solid black;">
            EARNINGS
          </div>
          <table style="width: 100%; border: 1px solid black; border-top: none; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: white;">
                <th style="padding: 6px 12px; text-align: left; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;"></th>
                <th style="padding: 6px 12px; text-align: right; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;">AMOUNT</th>
                <th style="padding: 6px 12px; text-align: right; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;">YTD</th>
              </tr>
            </thead>
            <tbody>
              ${data.earnings.map(earning => `
                <tr style="border-bottom: 1px solid #d1d5db;">
                  <td style="padding: 6px 12px; font-size: 10px; color: black;">${earning.name}</td>
                  <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${formatCurrency(earning.amount)}</td>
                  <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${earning.ytd ? formatCurrency(earning.ytd) : formatCurrency(earning.amount)}</td>
                </tr>
              `).join('')}
              <tr style="background: white; font-weight: 600; border-top: 2px solid black;">
                <td style="padding: 6px 12px; font-size: 10px; color: black;">Gross Earnings</td>
                <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${formatCurrency(data.grossEarnings)}</td>
                <td style="padding: 6px 12px;"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deductions -->
        <div>
          <div style="background: #f3f4f6; padding: 6px 12px; font-weight: 600; color: black; font-size: 12px; border: 1px solid black;">
            DEDUCTIONS
          </div>
          <table style="width: 100%; border: 1px solid black; border-top: none; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: white;">
                <th style="padding: 6px 12px; text-align: left; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;"></th>
                <th style="padding: 6px 12px; text-align: right; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;">AMOUNT</th>
                <th style="padding: 6px 12px; text-align: right; font-size: 10px; font-weight: 600; color: black; border-bottom: 1px solid black;">YTD</th>
              </tr>
            </thead>
            <tbody>
              ${data.deductions.map(deduction => `
                <tr style="border-bottom: 1px solid #d1d5db;">
                  <td style="padding: 6px 12px; font-size: 10px; color: black;">${deduction.name}</td>
                  <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${formatCurrency(deduction.amount)}</td>
                  <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${deduction.ytd ? formatCurrency(deduction.ytd) : formatCurrency(deduction.amount)}</td>
                </tr>
              `).join('')}
              <tr style="background: white; font-weight: 600; border-top: 2px solid black;">
                <td style="padding: 6px 12px; font-size: 10px; color: black;">Total Deductions</td>
                <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${formatCurrency(data.totalDeductions)}</td>
                <td style="padding: 6px 12px;"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Net Pay -->
      <div style="margin-bottom: 16px;">
        <div style="background: #f3f4f6; padding: 6px 12px; font-weight: 600; color: black; font-size: 12px; border: 1px solid black;">
          NET PAY
        </div>
        <table style="width: 100%; border: 1px solid black; border-top: none; border-collapse: collapse; font-size: 12px;">
          <tbody>
            <tr style="border-bottom: 1px solid #d1d5db;">
              <td style="padding: 6px 12px; font-size: 10px; color: black; width: 50%;">Gross Earnings</td>
              <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">${formatCurrency(data.grossEarnings)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #d1d5db;">
              <td style="padding: 6px 12px; font-size: 10px; color: black;">Total Deductions</td>
              <td style="padding: 6px 12px; font-size: 10px; text-align: right; color: black;">(-) ${formatCurrency(data.totalDeductions)}</td>
            </tr>
            <tr style="background: white; font-weight: bold; border-top: 2px solid black;">
              <td style="padding: 8px 12px; font-size: 12px; color: black;">Total Net Payable</td>
              <td style="padding: 8px 12px; font-size: 12px; text-align: right; color: black;">${formatCurrency(data.netPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in Words -->
      <div style="margin-bottom: 24px; padding: 12px; background: white; border: 1px solid black;">
        <p style="font-size: 10px; color: black; margin: 0;">
          <span style="font-weight: 600;">Total Net Payable</span> ${formatCurrency(data.netPay)} 
          <span style="color: black;"> (Indian Rupee ${amountInWords})</span>
        </p>
        <p style="font-size: 10px; color: black; margin: 4px 0 0 0;">
          **Total Net Payable = Gross Earnings - Total Deductions
        </p>
      </div>

      <!-- Footer -->
      <div style="font-size: 10px; color: black; text-align: center; border-top: 1px solid black; padding-top: 12px;">
        <p style="margin: 0;">This is a computer-generated payslip and does not require a signature.</p>
      </div>
    </div>
  `;
}

