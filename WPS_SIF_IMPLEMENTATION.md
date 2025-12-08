# WPS/SIF File Implementation Guide

## Overview

The Wage Protection System (WPS) is mandatory for all employers in Qatar and Saudi Arabia. This system ensures employees are paid their salaries on time through approved banking channels.

## Features Implemented

### 1. Qatar WPS/SIF File Generation

#### Three File Formats Available:

**A. SIF Format (Standard - Recommended)**
- **Format**: Pipe-delimited text file
- **Structure**:
  ```
  H|EstablishmentID|CompanyName|MMYYYY|EmployeeCount|TotalAmount
  D|RecordNo|QID|EmployeeName|IBAN|BankCode|BasicSalary|Allowances|Deductions|NetSalary
  T|TotalEmployees|TotalAmount
  ```
- **Usage**: Submit to Qatar banks for WPS compliance
- **File Name**: `WPS_SIF_[EstablishmentID]_[MMYYYY].txt`

**B. TXT Format (Simple)**
- **Format**: CSV-like text file
- **Structure**:
  ```
  HDR,EmployerID,Month,EmployeeCount,TotalSalary
  D,QID,IBAN,BasicSalary,Allowances,Overtime,Deductions,NetSalary
  FTR,TotalSalary
  ```
- **Usage**: Alternative format for internal processing
- **File Name**: `WPS_[EstablishmentID]_[YYYYMM].txt`

**C. CSV Format (Excel-Compatible)**
- **Format**: Standard CSV
- **Columns**: Record No, QID, Employee Name, IBAN, Bank Code, Basic Salary, Allowances, Deductions, Net Salary, Month, Year
- **Usage**: Easy to review in Excel/Google Sheets before submission
- **File Name**: `WPS_[EstablishmentID]_[MMYYYY].csv`

### 2. Data Validation

The system validates:
- ✅ Qatar ID (QID) is 11 digits
- ✅ IBAN starts with "QA" and is 29 characters
- ✅ All employees have valid QID and IBAN
- ✅ Net salary is greater than 0
- ✅ All required fields are present

### 3. Salary Components

The system tracks:
- **Basic Salary** - Base pay
- **Housing Allowance** - Accommodation allowance
- **Food Allowance** - Meal allowance
- **Transport Allowance** - Transportation allowance
- **Mobile Allowance** - Phone allowance
- **Utility Allowance** - Utilities allowance
- **Other Allowances** - Miscellaneous allowances
- **Overtime** - Overtime payments
- **Deductions** - Loans, advances, penalties

### 4. Payroll Processing Flow

1. **Setup Salary Components**
   - Navigate to Qatar Payroll → Salary Components tab
   - Add salary structure for each employee
   - System calculates total monthly salary automatically

2. **Process Monthly Payroll**
   - Select pay period (month/year)
   - Click "Process Payroll" button
   - System generates payroll records for all employees with active salary components
   - Records are created with status "approved"

3. **Generate WPS File**
   - Navigate to WPS / SIF Files tab
   - Enter Establishment ID (provided by Qatar Ministry of Labour)
   - Review validation warnings (fix missing QID/IBAN if any)
   - Choose file format:
     - **SIF Format** - For bank submission
     - **TXT Format** - For internal use
     - **CSV Format** - For review in Excel
   - Download and submit to your bank

4. **Submit to Bank**
   - Submit SIF file through your bank's WPS portal
   - Bank validates and processes the file
   - Salaries are transferred to employee accounts
   - System deadline: 7th of following month

## Database Schema

### Tables Created:

1. **qatar_salary_components**
   - Stores employee salary structure
   - Includes all allowances and basic salary
   - Tracks effective dates
   - Organization-specific

2. **qatar_payroll_records**
   - Monthly payroll records
   - Links to salary components
   - Tracks payment status (draft/approved/paid)
   - Includes working days, attendance, deductions

3. **qatar_overtime_records**
   - Overtime hours tracking
   - Different rates: Weekday (125%), Weekend (150%), Holiday (150%)
   - Links to payroll records

4. **qatar_eos_calculations**
   - End of Service gratuity calculations
   - Formula: (Basic × 21 days × Years) / 30
   - Tracks accrued and final settlements

5. **qatar_wps_sif_files**
   - Stores generated WPS file records
   - Tracks submission status
   - Bank reference tracking

## RLS Policies

All tables have Row Level Security (RLS) enabled with policies:

- **SELECT**: All organization members can view
- **INSERT/UPDATE/DELETE**: Admin, HR, and Finance roles only
- All policies verify organization membership
- Employees can view their own salary components

## Currency Format

All amounts are displayed in **QAR (Qatar Riyal)** format throughout the application:
- Example: 5,000 QAR
- No dollar ($), rupee (₹), or other currency symbols
- Comma-separated thousands
- Consistent across all modules:
  - ✅ Qatar Payroll Page
  - ✅ Saudi Payroll Page
  - ✅ Reports Page
  - ✅ Expenses Page
  - ✅ Dashboard
  - ✅ Employee Profiles
  - ✅ Settings (currency dropdown updated)

## File Submission Deadlines

### Qatar WPS
- **Generation**: Before 7th of following month
- **Submission**: Submit to bank by 7th
- **Penalties**: Late submission results in fines and work visa restrictions

### Important Notes
1. All employees MUST have Qatar ID (QID)
2. All employees MUST have IBAN (starting with "QA")
3. Establishment ID is mandatory (get from MOL)
4. Submit through your bank's WPS portal
5. Keep records for audit purposes

## Testing the Implementation

1. **Add Employees**
   - Ensure Qatar ID and IBAN are filled
   - Qatar ID: 11 digits (e.g., 12345678901)
   - IBAN: 29 characters starting with QA (e.g., QA58DOHB00001234567890ABCDEFG)

2. **Set Up Salary**
   - Go to Qatar Payroll → Salary Components
   - Click "Add Salary Component"
   - Fill in all allowances
   - Total salary is calculated automatically

3. **Process Payroll**
   - Select current month and year
   - Click "Process Payroll"
   - System generates records for all employees

4. **Generate WPS File**
   - Go to WPS / SIF Files tab
   - Enter Establishment ID (test: 12345678)
   - Click one of the format buttons
   - File downloads automatically
   - Preview shown on screen

## Troubleshooting

### "No employee records found"
- Ensure employees have salary components configured
- Check that payroll has been processed for the selected month

### "Employee missing QID"
- Update employee profile with Qatar ID
- QID must be exactly 11 digits

### "Employee missing IBAN"
- Update employee profile with IBAN
- IBAN must start with "QA" and be 29 characters

### "Validation errors"
- Review the error list shown
- Fix each issue before generating file
- Most common: missing QID or invalid IBAN format

## Support

For issues or questions:
1. Check employee data completeness
2. Verify salary components are active
3. Ensure payroll is processed for the period
4. Review validation errors carefully
5. Contact your bank for WPS portal issues

---

**System Status**: ✅ Fully Implemented & Tested
**Last Updated**: December 2024
**Version**: 1.0
