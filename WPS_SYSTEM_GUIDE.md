# Qatar WPS (Wage Protection System) - Complete Guide

## 🇶🇦 What is WPS?

**WPS = Wage Protection System**

WPS is a **mandatory payroll reporting system** issued by the **Qatar Ministry of Labour (MoL)**. Every company operating in Qatar must deposit salaries through a bank and submit a **WPS Salary Information File (SIF)** each month.

### Purpose
- Prove that employees received their salary on time
- Protect low-income workers from salary delays
- Avoid salary disputes between employers and employees
- Ensure companies comply with labor law

### Consequences of Non-Compliance
❌ **Late or missed WPS submission results in:**
- Heavy penalties and fines
- Company blacklisting
- Blocked work visa processing
- Bank refusal to process salary transfers
- Ministry of Labour sanctions

**This is the #1 compliance requirement for Qatar payroll.**

---

## 📄 WPS File Structure

The WPS file (SIF) is a special `.txt` file containing three parts:

### 1. **HDR (Header Line)**
Contains establishment information and summary totals.

**Format:**
```
HDR,employer_id,month(YYYYMM),employee_count,total_salary
```

**Example:**
```
HDR,12345678,202501,50,250000.00
```

**Fields:**
- `HDR` - Header identifier
- `12345678` - Establishment ID (Employer ID)
- `202501` - Salary month (January 2025 in YYYYMM format)
- `50` - Total number of employees
- `250000.00` - Total net salary amount

---

### 2. **D (Detail Lines)**
One line per employee containing their salary breakdown.

**Format:**
```
D,qid,iban,basic_salary,allowances,overtime,deductions,net_salary
```

**Example:**
```
D,98765432101,QA34560000012345678901,3000.00,1500.00,500.00,200.00,4800.00
```

**Fields:**
- `D` - Detail identifier
- `98765432101` - Employee Qatar ID (11 digits)
- `QA34560000012345678901` - Employee IBAN (29 characters, starts with QA)
- `3000.00` - Basic salary
- `1500.00` - Total allowances (housing + transport + food + mobile + utility + others)
- `500.00` - Overtime amount
- `200.00` - Total deductions
- `4800.00` - Net salary (basic + allowances + overtime - deductions)

---

### 3. **FTR (Footer Line)**
Verification line containing the total salary amount.

**Format:**
```
FTR,total_salary
```

**Example:**
```
FTR,250000.00
```

---

## 📋 Complete File Example

```
HDR,12345678,202501,6,24800.00
D,98765432101,QA58QNBA0000000000123456,3000.00,1000.00,0.00,0.00,4000.00
D,98765432102,QA58QNBA0000000000123457,2500.00,800.00,0.00,100.00,3200.00
D,98765432103,QA58QNBA0000000000123458,1800.00,600.00,50.00,0.00,2450.00
D,98765432104,QA58QNBA0000000000123459,2000.00,500.00,100.00,200.00,2400.00
D,98765432105,QA58QNBA0000000000123460,1500.00,400.00,0.00,0.00,1900.00
D,98765432106,QA58QNBA0000000000123461,2500.00,600.00,150.00,400.00,2850.00
FTR,24800.00
```

This file represents:
- **6 employees** paid in **January 2025**
- **Total payout: 24,800 QAR**
- Establishment ID: **12345678**

---

## 🚀 How to Use WPS in the HRMS

### Step 1: Set Up Employee Data
Before generating WPS files, ensure all employees have:
- ✅ **Qatar ID (QID)** - 11-digit number
- ✅ **IBAN** - 29-character Qatar bank account (starts with "QA")
- ✅ **Salary Components** - Basic salary and allowances configured

**Where to add this:**
1. Go to **Employees** page
2. Click on an employee
3. Fill in **Qatar ID** and **IBAN** in the Documents tab
4. Save changes

---

### Step 2: Process Monthly Payroll
1. Navigate to **Qatar Payroll** page
2. Select the **pay period** (month and year)
3. Click **"Process Payroll"**
4. System will calculate:
   - Basic salary
   - Allowances (housing, food, transport, mobile, utility, others)
   - Overtime (if any)
   - Deductions (if any)
   - Net salary

---

### Step 3: Generate WPS File
1. Go to **WPS / SIF Files** tab
2. Review the **WPS Summary**:
   - Total employees
   - Total basic salary
   - Total allowances
   - Total net salary
3. Check for **validation errors** (displayed in red box if any)
4. Fix any missing data:
   - Missing Qatar IDs
   - Missing IBANs
   - Invalid formats
5. Enter your **Establishment ID** (Employer ID from Qatar Ministry of Labour)
6. Click **"Generate & Download WPS SIF File"**
7. The system will:
   - Validate all data
   - Generate the WPS file in correct format
   - Download it as `WPS_[establishment_id]_[YYYYMM].txt`
   - Show a preview of the file

---

### Step 4: Submit to Bank
1. **Download the WPS file** from the system
2. **Log into your bank's online portal** (most Qatar banks have WPS submission portals)
3. **Upload the WPS SIF file**
4. **Submit before the monthly deadline** (usually 7th of the following month)
5. **Verify submission status** in bank portal

---

## ⚠️ Common Validation Errors

### Error: "Employee missing Qatar ID (QID)"
**Solution:** Update employee profile with 11-digit Qatar ID number

### Error: "Employee missing IBAN"
**Solution:** Add employee's 29-character Qatar IBAN (must start with "QA")

### Error: "Invalid IBAN format"
**Solution:** Ensure IBAN is exactly 29 characters and starts with "QA"

### Error: "Invalid QID length"
**Solution:** Qatar ID must be exactly 11 digits

### Error: "Zero or negative net salary"
**Solution:** Check salary calculations, ensure basic salary is positive

---

## 📊 WPS Requirements Checklist

### Before Processing Payroll:
- [ ] All employees have active salary components
- [ ] Basic salary amounts are correct
- [ ] Allowances are properly configured
- [ ] Overtime rates are set (if applicable)

### Before Generating WPS File:
- [ ] All employees have valid Qatar ID (11 digits)
- [ ] All employees have valid IBAN (29 characters, starts with QA)
- [ ] Payroll has been processed for the current month
- [ ] No validation errors shown in the system
- [ ] Establishment ID is available

### After Generating WPS File:
- [ ] File downloaded successfully
- [ ] Preview looks correct (HDR, D lines, FTR)
- [ ] Total amounts match payroll summary
- [ ] Submitted to bank before deadline

---

## 🏦 Bank Submission Deadlines

| Event | Deadline |
|-------|----------|
| Salary Payment | By 7th of following month |
| WPS File Submission | Within 7 days of payment |
| Bank Processing | 1-2 business days |
| MoL Verification | Automatic after bank upload |

**Example:**
- Salary for **January 2025** must be paid by **February 7, 2025**
- WPS file must be submitted by **February 14, 2025**

---

## 🛡️ Data Validation Rules

The system automatically validates:
1. **Qatar ID Format**
   - Exactly 11 digits
   - No special characters
   - Numeric only

2. **IBAN Format**
   - Exactly 29 characters
   - Must start with "QA"
   - Contains bank code and account number

3. **Salary Amounts**
   - Basic salary must be positive
   - Net salary must be greater than zero
   - All amounts in 2 decimal places

4. **Month Format**
   - YYYYMM format (e.g., 202501 for January 2025)
   - Valid month (01-12)
   - Valid year (current or future)

---

## 💡 Best Practices

### 1. **Regular Data Maintenance**
- Update employee data immediately when changes occur
- Verify Qatar IDs and IBANs during onboarding
- Keep salary structures up to date

### 2. **Monthly Workflow**
1. Process payroll by 5th of the month
2. Generate WPS file by 6th
3. Submit to bank by 7th
4. Verify bank acceptance by 8th

### 3. **Error Prevention**
- Run validation check before generating file
- Review file preview before submission
- Keep backup copies of all WPS files
- Maintain submission logs

### 4. **Compliance Documentation**
- Save copies of all WPS files
- Keep bank submission receipts
- Document any rejected submissions
- Track submission dates in calendar

---

## 🔧 Troubleshooting

### Q: WPS file generation is disabled
**A:** Process payroll first for the selected month/year

### Q: File shows validation errors
**A:** Fix all errors listed in the red validation box before generating file

### Q: Bank rejects WPS file
**A:**
1. Check file format matches exactly (HDR, D, FTR)
2. Verify establishment ID is correct
3. Ensure all IBANs are valid Qatar accounts
4. Confirm amounts match bank records

### Q: Employee IBAN not working
**A:**
1. Verify IBAN is 29 characters
2. Ensure it starts with "QA"
3. Confirm account is active with the bank
4. Check for typos in IBAN entry

---

## 📞 Support Resources

### Qatar Ministry of Labour
- Website: mol.gov.qa
- WPS Portal: wps.gov.qa
- Hotline: 16008

### Common Qatar Banks with WPS Support
- Qatar National Bank (QNB)
- Commercial Bank of Qatar (CBQ)
- Doha Bank
- Qatar Islamic Bank (QIB)
- Ahli Bank

---

## 📈 System Features

### Real-Time Validation
✅ Instant error detection
✅ Missing data warnings
✅ Format verification
✅ Amount calculations

### Automatic Calculations
✅ Gross salary
✅ Net salary
✅ Total allowances
✅ Total deductions

### File Generation
✅ Correct WPS format
✅ YYYYMM month format
✅ Proper header/footer
✅ Employee detail lines

### Compliance Support
✅ Data validation
✅ Error prevention
✅ File preview
✅ Deadline reminders

---

## 🎯 Summary

The WPS system in this HRMS:
1. **Validates** all employee data for Qatar compliance
2. **Calculates** salaries with allowances, overtime, and deductions
3. **Generates** WPS SIF files in the exact format required by Qatar Ministry of Labour
4. **Prevents** submission errors through comprehensive validation
5. **Ensures** your company stays compliant and avoids penalties

**Remember:** WPS compliance is mandatory for all Qatar companies. Late submissions result in serious consequences including fines, blacklisting, and visa blocks.
