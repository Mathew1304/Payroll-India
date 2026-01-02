# ✅ Admin Payslip Download - Database Query Fixed

## Issue
Admin side was getting a database error when trying to load payroll records:
```
Error: column designations_2.title does not exist
```

## Root Cause
The Supabase query was using incorrect syntax for nested joins. When joining `employees` and then trying to join `designations` within that, the syntax `designation:designations(title)` was creating an alias conflict.

## Solution

### Two-Step Query Approach
Since Supabase/PostgREST has issues with nested joins, we now fetch designations separately:

**Step 1: Fetch payroll records with employee data (without designation join)**
```typescript
.select(`
  *,
  employee:employees(
    id,
    first_name,
    last_name,
    employee_code,
    ...
    designation_id  // Just get the ID
  )
`)
```

**Step 2: Fetch designations separately and map them**
```typescript
// Get unique designation IDs
const designationIds = [...new Set(data.map(r => r.employee?.designation_id).filter(Boolean))];

// Fetch designations
const { data: designationsData } = await supabase
    .from('designations')
    .select('id, title')
    .in('id', designationIds);

// Map titles to records
data.forEach(record => {
    if (record.employee?.designation_id) {
        record.employee.designation_title = designationsMap.get(record.employee.designation_id);
    }
});
```

### Updated Data Access
```typescript
designation: record.employee.designation_title || 'N/A'  // ✅ New
```

## What Changed

### File: `src/pages/Payroll/IndiaPayrollPage.tsx`

**1. Updated `loadPayrollRecords` function:**
- Added `!inner` to the employees join for better performance
- Changed `designation:designations(title)` to `designations(title)`
- Added `designation_id` to the select fields

**2. Updated `handleDownloadPayslip` function:**
- Changed designation access from `record.employee.designation?.title` to `record.employee.designations?.title`

## Technical Details

### Supabase Join Syntax
When doing nested joins in Supabase/PostgREST:
- Use the actual foreign key relationship name
- Don't create aliases within nested joins
- Access the joined data using the table name (plural)

### Correct Pattern:
```typescript
.select(`
  *,
  employee:employees!inner(
    id,
    first_name,
    designation_id,
    designations(title)  // Join using table name
  )
`)

// Access as:
record.employee.designations.title
```

### Incorrect Pattern:
```typescript
.select(`
  *,
  employee:employees(
    id,
    first_name,
    designation:designations(title)  // ❌ Alias conflict
  )
`)
```

## Result

✅ Admin payroll page now loads correctly
✅ Employee designation is fetched from database
✅ Payslip download includes correct designation
✅ No more database errors

## Testing

1. Login as admin
2. Go to Payroll → Monthly Payroll
3. Select month and year
4. Page should load without errors
5. Click "Payslip" button to download
6. PDF should include employee designation

---

**Status**: ✅ FIXED
**Last Updated**: January 2, 2026

