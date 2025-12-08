# Bulk Employee Import Feature Guide

## Overview
The Bulk Employee Import feature allows organizations to migrate existing employee data from their old systems by importing multiple employees at once using CSV files. This is particularly useful for companies with 500+ employees who need to transition to the new HRMS system.

## Features

### 1. Country-Specific Templates
- **Qatar Template**: Includes fields like Qatar ID, Residence Permit, Work Permit, Health Card, Labor Card, Sponsor details, and IBAN
- **India Template**: Includes fields like PAN, Aadhaar, UAN, ESI, and IFSC Code
- **Saudi Arabia Template**: Similar structure with country-specific fields

### 2. CSV Template Download
- Download pre-formatted CSV templates specific to your organization's country
- Templates include example data to guide users
- All required and optional fields are clearly labeled

### 3. Data Validation
The system validates:
- **Required fields**: first_name, last_name, company_email, mobile_number
- **Email format**: Ensures valid email addresses
- **Data types**: Gender, employment_type, employment_status must match allowed values
- **Data integrity**: Checks for common data entry errors

### 4. Preview & Review
- View parsed data before importing
- See validation errors with row numbers and field names
- Preview shows first 10 rows with complete employee data
- Clear indication of which rows have errors

### 5. Batch Processing
- Imports employees in batches of 10 to prevent timeouts
- Real-time progress tracking with percentage completion
- Handles large datasets efficiently (tested up to 1000+ employees)

### 6. Error Reporting
- Detailed success/failure statistics after import
- Shows exactly how many employees were imported successfully
- Reports failed imports for troubleshooting

## How to Use

### Step 1: Access Bulk Import
1. Navigate to the **Employees** page
2. Click the **"Bulk Import"** button (orange button with upload icon)

### Step 2: Download Template
1. In the modal, click **"Download CSV Template"**
2. The template will be specific to your organization's country
3. Open the downloaded CSV file in Excel or any spreadsheet software

### Step 3: Prepare Your Data
Fill in the CSV file with your employee data:

#### Required Fields (Must be filled):
- `first_name` - Employee's first name
- `last_name` - Employee's last name
- `company_email` - Work email address (must be unique)
- `mobile_number` - Contact number

#### Common Optional Fields:
- `middle_name` - Middle name
- `date_of_birth` - Format: YYYY-MM-DD
- `gender` - Values: male, female, other
- `marital_status` - Values: single, married, divorced, widowed
- `personal_email` - Personal email
- `current_address` - Current residential address
- `city`, `state`, `pincode` - Location details
- `employment_type` - Values: full_time, part_time, contract, intern
- `employment_status` - Values: active, probation, on_hold
- `date_of_joining` - Format: YYYY-MM-DD
- `ctc_annual` - Annual compensation
- `basic_salary` - Monthly basic salary
- `bank_name` - Bank name
- `bank_account_number` - Account number
- `bank_branch` - Branch name

#### Qatar-Specific Fields:
- `qatar_id` - Qatar ID number
- `qatar_id_expiry` - Expiry date (YYYY-MM-DD)
- `residence_permit_number` - RP number
- `residence_permit_expiry` - RP expiry (YYYY-MM-DD)
- `work_permit_number` - Work permit number
- `work_permit_expiry` - Work permit expiry (YYYY-MM-DD)
- `health_card_number` - Health card number
- `health_card_expiry` - Health card expiry (YYYY-MM-DD)
- `labor_card_number` - Labor card number
- `labor_card_expiry` - Labor card expiry (YYYY-MM-DD)
- `sponsor_name` - Sponsor/Kafala name
- `sponsor_id` - Sponsor ID
- `bank_iban` - Bank IBAN (instead of IFSC)

#### India-Specific Fields:
- `pan_number` - PAN card number
- `aadhaar_number` - Aadhaar number
- `uan_number` - UAN number
- `esi_number` - ESI number
- `bank_ifsc_code` - Bank IFSC code

### Step 4: Upload CSV File
1. Save your completed CSV file
2. In the Bulk Import modal, click the upload area or drag and drop your CSV file
3. The system will automatically parse and validate the data

### Step 5: Review Preview
1. Review the parsed data preview
2. Check for any validation errors (shown in red)
3. If errors exist, fix them in your CSV file and re-upload
4. Valid rows will be marked in green

### Step 6: Start Import
1. Click **"Import X Employees"** button
2. Watch the progress bar as employees are imported
3. Wait for the completion message

### Step 7: Review Results
1. See the success/failure summary
2. Note any failed imports for manual entry
3. Click **"Done"** to close and view imported employees

## Best Practices

### Data Preparation
1. **Clean your data** before importing - remove duplicates, fix formatting issues
2. **Use consistent date format**: Always use YYYY-MM-DD format
3. **Validate email addresses** to ensure they're unique and valid
4. **Test with small batch first**: Import 5-10 employees first to verify your data format
5. **Keep a backup** of your original data file

### Field Mapping Tips
1. If your current system uses different field names, map them to our template fields
2. For dropdown fields (gender, employment_type), use exact values from the template
3. Leave optional fields blank if data is not available
4. Don't add extra columns - use only the template fields

### Error Handling
1. **Review validation errors carefully** - they indicate data format issues
2. **Common errors**:
   - Invalid email format
   - Wrong date format (should be YYYY-MM-DD)
   - Invalid enum values (e.g., gender must be male/female/other)
   - Missing required fields
3. Fix errors in your CSV file and re-upload rather than proceeding with errors

### Large Imports
1. For 500+ employees, consider splitting into multiple files of 200-300 employees each
2. Monitor the import progress - don't close the browser during import
3. Internet connection must be stable during import
4. After import, verify a random sample of employees to ensure data accuracy

## Technical Details

### Supported File Format
- **Format**: CSV (Comma-Separated Values)
- **Encoding**: UTF-8
- **Size limit**: Recommended up to 5MB per file
- **Row limit**: No hard limit, but 500 rows per batch is recommended

### Import Performance
- **Processing speed**: ~10 employees per second
- **Batch size**: 10 employees per batch
- **Progress tracking**: Real-time percentage updates
- **Error handling**: Failed rows don't stop the entire import

### Data Validation Rules
- Email must contain "@" symbol
- Gender must be: male, female, or other
- Employment type must be: full_time, part_time, contract, or intern
- Employment status must be: active, probation, on_hold, inactive, or terminated
- Dates must be in YYYY-MM-DD format
- Required fields cannot be empty

## Troubleshooting

### Issue: "Please upload a CSV file"
**Solution**: Ensure your file has a .csv extension. If you're using Excel, use "Save As" and select CSV format.

### Issue: "Error parsing CSV file"
**Solution**:
- Check for special characters in your data
- Ensure all fields are properly enclosed in quotes if they contain commas
- Verify the file is not corrupted

### Issue: Validation errors for many rows
**Solution**:
- Download a fresh template
- Copy your data column by column to ensure proper formatting
- Check date formats (must be YYYY-MM-DD)
- Verify enum values match exactly (case-sensitive)

### Issue: Import stuck at a percentage
**Solution**:
- Check your internet connection
- Don't refresh the page - wait for timeout
- If it times out, check which employees were imported and re-import the rest

### Issue: Some employees failed to import
**Solution**:
- Check the failure count in results
- Review the console for specific error messages
- Common causes: duplicate emails, invalid foreign keys (department/designation IDs)
- Manually add failed employees or fix the data and re-import

## Security & Privacy

- All data is encrypted during upload
- Only HR admins can perform bulk imports
- Import logs are maintained for audit purposes
- Employee data is immediately protected by Row Level Security (RLS)
- No data is stored temporarily - direct database insertion

## Migration Checklist

- [ ] Export employee data from your old system
- [ ] Download the appropriate country template
- [ ] Map your old system fields to template fields
- [ ] Clean and validate your data
- [ ] Test import with 5-10 employees
- [ ] Review test import for accuracy
- [ ] Perform full import in batches
- [ ] Verify all employees are imported
- [ ] Manually add any failed imports
- [ ] Verify sensitive data (salary, IDs) is correct
- [ ] Send welcome emails to employees
- [ ] Archive your CSV files securely

## Support

If you encounter issues during bulk import:
1. Check this guide for troubleshooting steps
2. Review validation errors carefully
3. Test with a smaller dataset
4. Contact system administrator for database-level issues

## Version History

- **v1.0.0** (Dec 2024) - Initial release with Qatar, India support
  - Country-specific templates
  - Batch processing
  - Real-time validation
  - Progress tracking
  - Error reporting
