import { X, Download, Printer } from 'lucide-react';
import { PayslipTemplate } from './PayslipTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PayslipModalProps {
  data: {
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
  };
  onClose: () => void;
}

export function PayslipModal({ data, onClose }: PayslipModalProps) {
  const handleDownloadPDF = async () => {
    const element = document.getElementById('payslip-template');
    if (!element) return;

    try {
      // Capture the element as canvas
      const canvas = await html2canvas(element, {
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
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-slate-800">Payslip</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors print:hidden"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Payslip Content */}
        <div className="p-6">
          <PayslipTemplate data={data} />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-template, #payslip-template * {
            visibility: visible;
          }
          #payslip-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

