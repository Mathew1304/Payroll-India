# Complete Payroll Payment Workflow Guide

## Overview
After processing payroll, follow this step-by-step guide to pay employees and maintain compliance.

---

## 🔄 Payment Status Lifecycle

### 1️⃣ **DRAFT** (Initial Status)
- ✅ Payroll processed and calculated
- ❌ Not yet ready for payment
- **Action**: Review and verify all amounts

### 2️⃣ **PENDING PAYMENT** (Ready to Pay)
- ✅ Payroll verified and approved
- ✅ WPS file generated
- ❌ Not yet uploaded to bank
- **Action**: Generate WPS/SIF file, upload to bank

### 3️⃣ **SUBMITTED TO BANK** (In Progress)
- ✅ WPS file uploaded to bank portal
- ❌ Bank transfer not yet completed
- **Action**: Wait for bank processing (1-2 business days)

### 4️⃣ **PAID** (Transfer Complete)
- ✅ Bank transfer completed
- ✅ Employees received salaries
- ❌ Not yet submitted to ministry
- **Action**: Submit WPS file to Ministry of Labour

### 5️⃣ **CONFIRMED** (Fully Complete)
- ✅ Employees paid
- ✅ WPS submitted to ministry
- ✅ Compliance complete
- **Action**: Archive and close payroll period

---

## 📋 Step-by-Step Payment Process

### **STEP 1: Review Payroll Records**

**Location**: Qatar Payroll → Monthly Payroll tab

1. Select the month/year
2. Review all employee payroll records
3. Verify amounts are correct
4. Check status shows "draft"

### **STEP 2: Run Pre-Payment Validation**

**Location**: Qatar Payroll → WPS / SIF Files tab

```bash
Click "Run Validation" button
```

**Check for:**
- ❌ Missing Qatar IDs (QID)
- ❌ Missing IBAN numbers
- ❌ Invalid IBAN format (must be 29 chars starting with QA)
- ❌ Expired documents

**Fix all errors before proceeding!**

### **STEP 3: Generate WPS File**

**Location**: Qatar Payroll → WPS / SIF Files tab

1. **Enter Establishment ID**: Your company's MOL registration number
   - Example: `EST-12345678`

2. **Choose Format**:
   - **SIF File** (Recommended) - Official Qatar MOL format
   - **TXT File** - Simple text format
   - **CSV File** - Excel-compatible format

3. **Click "Generate SIF File"**
   - Downloads: `WPS_SIF_[ID]_[MMYYYY].txt`

4. **Verify File Contents**:
   - Check employee count
   - Verify total salary amount
   - Ensure all IBANs are present

### **STEP 4: Upload to Bank Portal**

**Bank Portals by Institution:**

#### **Qatar National Bank (QNB)**
1. Login to QNB Corporate Online Banking
2. Go to: **Payments → WPS → Upload File**
3. Select your WPS file
4. Review summary and confirm
5. Get reference number

#### **Commercial Bank of Qatar (CBQ)**
1. Login to CBQ eZbusiness
2. Go to: **Salary Processing → WPS Upload**
3. Upload SIF file
4. Approve transaction
5. Note reference number

#### **Doha Bank**
1. Login to Doha Bank Corporate
2. Go to: **Payroll → WPS Transfer**
3. Upload salary file
4. Submit for processing
5. Save transaction reference

#### **Other Banks**
- Look for: "WPS", "Salary Upload", "Bulk Payments", "Payroll"
- Upload the SIF file generated in Step 3
- Always save the bank reference number

### **STEP 5: Update Payment Status in System**

**After uploading to bank:**

1. Go to **Monthly Payroll** tab
2. Select the payroll period
3. **Click "Mark as Submitted to Bank"** (coming soon in UI)
4. Enter:
   - Bank Reference Number: `[From bank portal]`
   - Submission Date: `[Today's date]`
   - Notes: Optional details

**Status changes**: `draft` → `submitted_to_bank`

### **STEP 6: Confirm Payment (After 1-2 Days)**

**After bank processes transfer:**

1. Check your bank account for debit
2. Verify employees received payments
3. Go to **Monthly Payroll** tab
4. **Click "Mark as Paid"**
5. Enter:
   - Payment Date: `[Actual transfer date]`
   - Notes: Any relevant details

**Status changes**: `submitted_to_bank` → `paid`

### **STEP 7: Submit to Ministry of Labour**

**Qatar MOL Portal:**

1. Login to: https://mol.gov.qa
2. Go to: **WPS Services**
3. Upload the same SIF file
4. Or your bank may auto-submit

**Update System:**
1. **Click "Mark as Ministry Confirmed"**
2. Enter:
   - WPS Submission Date
   - MOL Reference Number (if any)

**Status changes**: `paid` → `confirmed`

---

## 💳 Payment Methods

### **Method 1: WPS Bank Transfer (Recommended)**
- **Compliance**: ✅ MOL required
- **Speed**: 1-2 business days
- **Cost**: Bank charges apply
- **Records**: Automatic tracking
- **Best for**: All GCC companies

### **Method 2: Cash Payment**
- **Compliance**: ❌ Not MOL compliant
- **Speed**: Immediate
- **Cost**: No bank fees
- **Records**: Manual tracking required
- **Best for**: Emergency only (not recommended)

### **Method 3: Cheque**
- **Compliance**: ❌ Not MOL compliant
- **Speed**: 2-5 business days
- **Cost**: Cheque book fees
- **Records**: Manual tracking
- **Best for**: Not recommended in Qatar

---

## 🎯 Quick Reference Card

| Status | What to Do | Where |
|--------|-----------|-------|
| **Draft** | Review amounts | Monthly Payroll tab |
| **Draft** → **Pending** | Generate WPS file | WPS/SIF Files tab |
| **Pending** → **Submitted** | Upload to bank portal | Bank website |
| **Submitted** → **Paid** | Wait for transfer | Check bank account |
| **Paid** → **Confirmed** | Submit to MOL | MOL portal |

---

## ⚠️ Common Issues & Solutions

### **Issue: Bank Rejects WPS File**
**Causes:**
- Invalid IBAN format
- Missing Qatar IDs
- File format incorrect

**Solutions:**
1. Run validation again
2. Fix employee data
3. Regenerate WPS file
4. Re-upload to bank

### **Issue: Employee Didn't Receive Payment**
**Check:**
1. Is IBAN correct in employee profile?
2. Is IBAN active at the bank?
3. Did bank process the file successfully?
4. Check bank rejection report

**Solution:**
- Update employee IBAN
- Process individual bank transfer
- Include in next month's payroll

### **Issue: Ministry Rejects WPS Submission**
**Common Reasons:**
- File submitted after deadline (usually 7th of month)
- Employee not registered in MOL system
- Salary below minimum wage

**Solution:**
- Resubmit immediately
- Contact MOL support
- Ensure all employees are registered

---

## 📊 Reporting & Compliance

### **Monthly Reports to Generate:**
1. ✅ Payroll Summary Report
2. ✅ WPS Submission Confirmation
3. ✅ Bank Transfer Receipt
4. ✅ MOL Acceptance Certificate
5. ✅ Employee Payslips (download individually)

### **Records to Maintain:**
- 📁 WPS SIF files (keep for 5 years)
- 📁 Bank transfer receipts
- 📁 MOL submission confirmations
- 📁 Monthly payroll reports
- 📁 Employee payslips

---

## 🔐 Security Best Practices

1. **Restrict Access**: Only finance/HR should process payments
2. **Dual Approval**: Require two approvals for large amounts
3. **Bank Limits**: Set daily transfer limits
4. **Audit Trail**: System logs all payment status changes
5. **Secure Storage**: Keep WPS files encrypted

---

## ⏰ Qatar Payment Deadlines

| Task | Deadline |
|------|----------|
| Process Payroll | Before month end |
| Generate WPS File | 1st-5th of month |
| Submit to Bank | By 5th of month |
| Bank Processing | 1-2 days |
| Pay Employees | By 7th of month |
| Submit to MOL | By 7th of month |

**⚠️ Late Payment Penalties:**
- QAR 6,000 per employee for first offense
- QAR 12,000 per employee for repeat offenses
- Possible business closure

---

## 📱 Quick Actions

### **Need to Pay Now?**
```
1. Go to: Qatar Payroll → WPS/SIF Files
2. Click: Run Validation
3. Fix any errors
4. Click: Generate SIF File
5. Upload to your bank portal
6. Update status to "Submitted to Bank"
7. Wait 1-2 days for bank processing
8. Mark as "Paid" when complete
```

### **Need Help?**
- Check validation errors in WPS tab
- Review employee profiles for missing data
- Contact your bank's WPS support team
- Refer to MOL guidelines: https://mol.gov.qa

---

## ✅ Payment Completion Checklist

After completing all steps:

- [ ] All employees received correct amounts
- [ ] Bank account debited correctly
- [ ] WPS file submitted to MOL
- [ ] MOL acceptance received
- [ ] Employee payslips downloaded/sent
- [ ] Payment status marked as "Confirmed"
- [ ] Monthly reports generated
- [ ] Files archived securely

**Payroll cycle complete! 🎉**
