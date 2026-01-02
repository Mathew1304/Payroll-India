import { format } from 'date-fns';

interface PayslipTemplateProps {
  data: {
    // Company Info
    companyName: string;
    companyAddress?: string;
    
    // Employee Info
    employeeName: string;
    employeeCode: string;
    designation?: string;
    joiningDate?: string;
    
    // Pay Period
    payPeriod: string;
    payDate: string;
    paidDays: number;
    lopDays: number;
    
    // Earnings
    earnings: Array<{
      name: string;
      amount: number;
      ytd?: number;
    }>;
    
    // Deductions
    deductions: Array<{
      name: string;
      amount: number;
      ytd?: number;
    }>;
    
    // Totals
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
  };
}

export function PayslipTemplate({ data }: PayslipTemplateProps) {
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

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="payslip-template">
      {/* Header */}
      <div className="border-b border-black pb-2 mb-4">
        <h1 className="text-xl font-bold text-black">{data.companyName}</h1>
        {data.companyAddress && (
          <p className="text-xs text-black mt-1">{data.companyAddress}</p>
        )}
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-black uppercase">
          Payslip for the month of {data.payPeriod}
        </h2>
      </div>

      {/* Employee Pay Summary */}
      <div className="mb-4">
        <div className="bg-gray-100 px-3 py-1.5 font-semibold text-black text-sm border border-black">
          EMPLOYEE PAY SUMMARY
        </div>
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 p-3 border border-t-0 border-black text-sm">
          <div className="flex">
            <span className="text-black w-32">Employee Name</span>
            <span className="text-black">: {data.employeeName}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-black mr-4">Employee Net Pay</span>
          </div>
          
          <div className="flex">
            <span className="text-black w-32">Designation</span>
            <span className="text-black">: {data.designation || 'N/A'}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-2xl font-bold text-black">{formatCurrency(data.netPay)}</span>
          </div>
          
          <div className="flex">
            <span className="text-black w-32">Date of Joining</span>
            <span className="text-black">: {data.joiningDate || 'N/A'}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-black text-xs">Paid Days : {data.paidDays} | LOP Days : {data.lopDays}</span>
          </div>
          
          <div className="flex">
            <span className="text-black w-32">Pay Period</span>
            <span className="text-black">: {data.payPeriod}</span>
          </div>
          
          <div className="flex">
            <span className="text-black w-32">Pay Date</span>
            <span className="text-black">: {data.payDate}</span>
          </div>
        </div>
      </div>

      {/* Earnings and Deductions Table */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Earnings */}
          <div>
            <div className="bg-gray-100 px-3 py-1.5 font-semibold text-black text-sm border border-black">
              EARNINGS
            </div>
            <table className="w-full border border-t-0 border-black text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-black border-b border-black"></th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-black border-b border-black">AMOUNT</th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-black border-b border-black">YTD</th>
                </tr>
              </thead>
              <tbody>
                {data.earnings.map((earning, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="px-3 py-1.5 text-xs text-black">{earning.name}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-black">{formatCurrency(earning.amount)}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-black">{earning.ytd ? formatCurrency(earning.ytd) : formatCurrency(earning.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-white font-semibold border-t-2 border-black">
                  <td className="px-3 py-1.5 text-xs text-black">Gross Earnings</td>
                  <td className="px-3 py-1.5 text-xs text-right text-black">{formatCurrency(data.grossEarnings)}</td>
                  <td className="px-3 py-1.5"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <div className="bg-gray-100 px-3 py-1.5 font-semibold text-black text-sm border border-black">
              DEDUCTIONS
            </div>
            <table className="w-full border border-t-0 border-black text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-black border-b border-black"></th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-black border-b border-black">AMOUNT</th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-black border-b border-black">YTD</th>
                </tr>
              </thead>
              <tbody>
                {data.deductions.map((deduction, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="px-3 py-1.5 text-xs text-black">{deduction.name}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-black">{formatCurrency(deduction.amount)}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-black">{deduction.ytd ? formatCurrency(deduction.ytd) : formatCurrency(deduction.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-white font-semibold border-t-2 border-black">
                  <td className="px-3 py-1.5 text-xs text-black">Total Deductions</td>
                  <td className="px-3 py-1.5 text-xs text-right text-black">{formatCurrency(data.totalDeductions)}</td>
                  <td className="px-3 py-1.5"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Net Pay Summary */}
      <div className="mb-4">
        <div className="bg-gray-100 px-3 py-1.5 font-semibold text-black text-sm border border-black">
          NET PAY
        </div>
        <table className="w-full border border-t-0 border-black text-sm">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-1.5 text-xs text-black w-1/2">Gross Earnings</td>
              <td className="px-3 py-1.5 text-xs text-right text-black">{formatCurrency(data.grossEarnings)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-1.5 text-xs text-black">Total Deductions</td>
              <td className="px-3 py-1.5 text-xs text-right text-black">(-) {formatCurrency(data.totalDeductions)}</td>
            </tr>
            <tr className="bg-white font-bold border-t-2 border-black">
              <td className="px-3 py-2 text-sm text-black">Total Net Payable</td>
              <td className="px-3 py-2 text-sm text-right text-black">{formatCurrency(data.netPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="mb-6 p-3 bg-white border border-black">
        <p className="text-xs text-black">
          <span className="font-semibold">Total Net Payable</span> {formatCurrency(data.netPay)} 
          <span className="text-black"> (Indian Rupee {amountInWords})</span>
        </p>
        <p className="text-xs text-black mt-1">
          **Total Net Payable = Gross Earnings - Total Deductions
        </p>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-black text-center border-t border-black pt-3">
        <p>This is a computer-generated payslip and does not require a signature.</p>
      </div>
    </div>
  );
}

