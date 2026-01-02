# Payslip Template Feature

## Overview

A professional payslip template has been created that matches the format shown in your reference image, using data from your database without any third-party branding.

## Files Created

### 1. `src/components/Payroll/PayslipTemplate.tsx`
The main payslip template component that displays:
- Company information
- Employee details (name, code, designation, joining date)
- Pay period and payment date
- Paid days and LOP days
- Earnings breakdown with YTD (Year-to-Date) values
- Deductions breakdown with YTD values
- Gross earnings, total deductions, and net pay
- Amount in words (Indian Rupee format)

### 2. `src/components/Payroll/PayslipModal.tsx`
A modal wrapper that provides:
- View payslip in a modal
- Download as PDF functionality
- Print functionality
- Clean, professional UI

### 3. Updated `src/pages/Payroll/EmployeePayrollPage.tsx`
Enhanced with:
- "View" button to display payslip in modal
- "Download" button to download PDF
- Integration with new payslip template

## Features

### Professional Layout
- Clean, organized design similar to the reference image
- Company header without logos
- Clear sections for employee info, earnings, and deductions
- Professional typography and spacing

### Data Display
- **Employee Information**: Name, code, designation, joining date
- **Pay Period Details**: Month/year, payment date, paid days, LOP days
- **Earnings**: All salary components with amounts and YTD
- **Deductions**: All deduction types with amounts and YTD
- **Summary**: Gross earnings, total deductions, net pay
- **Amount in Words**: Converts net pay to Indian Rupee words

### Actions
1. **View**: Opens payslip in a modal for on-screen viewing
2. **Download PDF**: Generates and downloads PDF version
3. **Print**: Browser print functionality

## Installation

Run the following command to install the required package:

```bash
npm install html2canvas
```

## Usage

### For Employees

1. Navigate to the Payroll page
2. Find the desired pay period
3. Click **"View"** to see the payslip in a modal
4. Click **"Download"** to get a PDF copy
5. Click **"Print"** to print the payslip

### Data Flow

The payslip pulls data from:
- **Organization**: Company name and address
- **Employees**: Employee details, designation, joining date
- **India Payroll Records**: All salary and deduction components

## Customization

### Modify Template

Edit `src/components/Payroll/PayslipTemplate.tsx` to:
- Change layout and styling
- Add/remove fields
- Modify currency format
- Adjust number-to-words conversion

### Modify Modal

Edit `src/components/Payroll/PayslipModal.tsx` to:
- Change modal size or behavior
- Customize PDF generation settings
- Add additional actions

## Technical Details

### Currency Formatting
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};
```

### Number to Words
Converts numeric amounts to Indian Rupee words:
- Supports Crores, Lakhs, Thousands
- Example: 87300 → "Eighty Seven Thousand Three Hundred Only"

### PDF Generation
Uses `html2canvas` to capture the template and `jsPDF` to create PDF:
- A4 size format
- High quality (scale: 2)
- Automatic filename based on employee code and period

## Styling

The template uses Tailwind CSS classes for:
- Responsive layout
- Professional color scheme (slate/gray tones)
- Print-friendly styles
- Clean borders and spacing

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Print functionality works across all browsers
- PDF download supported in all modern browsers

## Future Enhancements

Potential improvements:
- Email payslip directly to employee
- Bulk download multiple payslips
- Custom branding/logo support
- Multi-language support
- Digital signature integration

## Troubleshooting

### PDF Not Downloading
- Check browser console for errors
- Ensure html2canvas and jsPDF are installed
- Verify browser allows downloads

### Missing Data
- Check database for complete employee records
- Verify payroll records have all required fields
- Ensure organization details are set

### Styling Issues
- Clear browser cache
- Check Tailwind CSS is properly configured
- Verify all CSS classes are available

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database records are complete
3. Ensure all npm packages are installed
4. Review component props and data structure

