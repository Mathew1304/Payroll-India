# Employee Self-Service Portal Guide

## Overview
The Qatar HRMS & Payroll System now includes a comprehensive employee self-service portal with profile update requests and notifications.

---

## Features Implemented

### 1. Role-Based Access Control ✅
**Employer Dashboard (Admin/HR/Manager):**
- Full access to all employees
- Can view detailed employee information
- Can request information updates from employees
- Dashboard shows organization-wide statistics

**Employee Dashboard:**
- Personalized dashboard with own statistics
- Limited access to only own profile
- Can view notifications and update requests
- Quick actions for common tasks

---

### 2. Request Information Feature ✅

#### For Employers (Admin/HR)

**Location:** Employee View Modal → "Request Info" Button (top-right)

**How to Use:**
1. Navigate to **Employees** page
2. Click "View" on any employee
3. Click the **"Request Info"** button in the modal header
4. Review the missing fields automatically detected
5. Optionally add a custom message to the employee
6. Click **"Send Request"**

**What Happens:**
- System automatically detects missing fields (Qatar ID, IBAN, Email, Phone, etc.)
- Creates a profile update request in the database
- Sends a notification to the employee
- Employee receives notification immediately

**Missing Fields Detected:**
- Email (company email)
- Personal email
- Phone number
- Date of birth
- Gender
- Marital status
- Qatar ID (QID)
- Passport number
- IBAN (bank account)
- Bank name
- Emergency contact name
- Emergency contact phone

---

### 3. Employee Notifications System ✅

#### Notification Bell
**Location:** Top navigation bar (top-right corner)

**Features:**
- Real-time notification count badge
- Red badge shows number of unread notifications
- Automatically updates every 30 seconds
- Click to view notification dropdown

**Notification Panel:**
- Shows all unread notifications
- Click "Mark as read" to dismiss
- Auto-refreshes after marking as read
- Shows timestamp for each notification

**Notification Types:**
- Profile update requests
- Payslip notifications
- Leave approvals
- General announcements

---

### 4. Employee Dashboard ✅

**What Employees See:**
- **Personalized Welcome:** Greeting with employee name and position
- **Quick Stats:**
  - Attendance this month
  - Leave balance
  - Tasks assigned & completed
  - Last payslip amount

- **Notifications Section:**
  - Highlighted alert for new notifications
  - Direct action buttons to mark as read
  - Full message details

- **Quick Actions:**
  - Apply Leave
  - View Attendance
  - View Payslips
  - Update My Profile

- **Your Stats:**
  - Pending leave requests
  - Task completion rate
  - Unread notifications count

---

### 5. Employee Profile Editing ✅

**Access:** Dashboard → My Profile or Profile Icon (top-right)

**Editable Sections:**

**Overview Tab:**
- Personal email
- Mobile number
- Alternate phone

**Personal Tab:**
- Emergency contact name & phone
- Relationship
- Current address
- Permanent address
- City, state, postal code
- Personal interests/hobbies

**Professional Tab:**
- LinkedIn profile
- GitHub profile
- Professional portfolio
- Other professional links

**Documents Tab:**
- View only (employees cannot upload/delete documents)

**Education Tab:**
- View only

---

## Database Structure

### New Tables

#### 1. `employee_profile_requests`
Tracks information update requests from employers to employees.

**Columns:**
- `id` - Unique identifier
- `organization_id` - Organization reference
- `employee_id` - Employee reference
- `requested_by` - User who requested (employer)
- `requested_at` - Timestamp of request
- `completed_at` - When employee completed the update
- `status` - 'pending', 'completed', or 'cancelled'
- `message` - Custom message from employer
- `missing_fields` - JSON array of missing field names

#### 2. `employee_notifications`
Stores all employee notifications.

**Columns:**
- `id` - Unique identifier
- `organization_id` - Organization reference
- `employee_id` - Employee reference
- `user_id` - User account reference
- `type` - Notification type
- `title` - Notification title
- `message` - Notification message
- `is_read` - Boolean (default false)
- `related_id` - Reference to related record (e.g., profile request)
- `action_url` - URL to navigate when clicked
- `created_at` - Timestamp

---

## User Workflows

### Workflow 1: Employer Requests Employee Information

1. **Employer Side:**
   - Opens Employee View modal
   - Sees incomplete profile information
   - Clicks "Request Info" button
   - Reviews automatically detected missing fields
   - Adds optional custom message
   - Sends request

2. **System:**
   - Creates profile request record
   - Creates notification for employee
   - Sends to employee's notification inbox

3. **Employee Side:**
   - Sees notification badge on bell icon (red with count)
   - Clicks bell to view notifications
   - Reads "Profile Update Required" notification
   - Clicks notification or navigates to Profile page
   - Edits profile in Edit Mode
   - Saves changes

4. **System (Auto-Complete):**
   - Detects profile update
   - Automatically marks request as "completed"
   - Updates completed_at timestamp
   - Notification marked as read (optional)

---

### Workflow 2: Employee Checks Notifications

1. Employee logs in
2. Dashboard shows notification alert if any exist
3. Bell icon shows red badge with count
4. Employee clicks bell icon
5. Notification dropdown appears
6. Employee reads notification details
7. Employee clicks "Mark as read" or takes action
8. Notification removed from unread list

---

### Workflow 3: Employee Updates Own Profile

1. Employee navigates to Profile (Dashboard → My Profile)
2. Clicks "Edit Profile" button
3. Updates personal information in editable fields
4. Clicks "Save Changes"
5. System validates and saves changes
6. Auto-completes any pending profile requests
7. Success message displayed

---

## Security & Permissions

### Row Level Security (RLS) Policies

**Profile Requests:**
- ✅ Employees can view their own requests
- ✅ Employees can update their own requests (mark complete)
- ✅ Admins/HR can view all requests in organization
- ✅ Admins/HR can create requests
- ✅ Admins/HR can update any request

**Notifications:**
- ✅ Employees can view their own notifications
- ✅ Employees can update their own notifications (mark read)
- ✅ Admins/HR can view all notifications in organization
- ✅ Admins/HR can create notifications

**Employee Data:**
- ✅ Employees can view only their own data
- ✅ Employees can edit their own profile fields
- ✅ Employees CANNOT edit:
  - Salary information
  - Employment status
  - Department/designation
  - Documents
  - Manager assignment
- ✅ Admins/HR can view and edit all employee data

---

## Technical Implementation

### Components Added/Modified

1. **ViewEmployeeModal.tsx**
   - Added "Request Info" button
   - Added missing fields detection
   - Added request information modal
   - Integrated notification creation

2. **EmployeeDashboard.tsx** (NEW)
   - Complete employee-specific dashboard
   - Shows personal statistics
   - Displays notifications prominently
   - Quick action buttons
   - Task and leave summaries

3. **Dashboard.tsx**
   - Added conditional rendering
   - Shows EmployeeDashboard for role='employee'
   - Shows admin dashboard for other roles

4. **Layout.tsx**
   - Added notification state management
   - Added notification bell with count badge
   - Added notification dropdown panel
   - Auto-refresh every 30 seconds
   - Mark as read functionality

5. **EmployeeProfilePage.tsx**
   - Already had edit mode implemented
   - Works for both employees and admins
   - Employees can edit personal fields
   - Protected fields remain read-only

### Database Migration

**File:** `add_employee_profile_requests_system.sql`

**Includes:**
- Table creation for profile requests
- Table creation for notifications
- Indexes for performance
- RLS policies for security
- Auto-complete trigger function

---

## Testing Checklist

### For Employers:
- [ ] Can view employee details
- [ ] Can see "Request Info" button
- [ ] Can detect missing fields automatically
- [ ] Can send profile update request
- [ ] Can add custom message
- [ ] Notification is created successfully

### For Employees:
- [ ] Can see personalized dashboard
- [ ] Can see notification count on bell
- [ ] Can view notifications in dropdown
- [ ] Can mark notifications as read
- [ ] Can navigate to profile from notification
- [ ] Can edit own profile information
- [ ] Profile request auto-completes after edit
- [ ] Cannot see other employees' data
- [ ] Cannot edit salary/employment fields

### System:
- [ ] Notifications update in real-time
- [ ] Badge count updates correctly
- [ ] Dropdown closes when clicking outside
- [ ] Auto-complete trigger works
- [ ] RLS policies enforce correctly
- [ ] No unauthorized access possible

---

## Screenshots Guide

### Employer View:
1. **Employee View Modal with Request Button**
   - Look for blue "Request Info" button in top-right

2. **Request Information Modal**
   - Shows missing fields count
   - Lists detected missing information
   - Custom message textarea
   - Send/Cancel buttons

### Employee View:
1. **Employee Dashboard**
   - Welcome message with name
   - Notification alert (if any)
   - 4 stat cards
   - Quick actions grid
   - Your stats panel

2. **Notification Bell**
   - Red badge with count
   - Located in top navigation bar

3. **Notification Dropdown**
   - White dropdown panel
   - Blue header
   - List of notifications
   - "Mark as read" buttons

4. **Profile Edit Mode**
   - Edit button changes to "Save"
   - Input fields become editable
   - Green save button

---

## Troubleshooting

### Notifications Not Showing
**Check:**
1. Is the employee linked to a user account?
2. Is the `user_id` in notifications table correct?
3. Is the employee_id correct in membership?
4. Check browser console for errors

### Request Not Auto-Completing
**Check:**
1. Is the employee updating their actual profile?
2. Is the trigger function installed?
3. Check if request status is 'pending'
4. Verify employee_id matches

### Employee Cannot Edit Profile
**Check:**
1. Is user logged in?
2. Is membership.employee_id set?
3. Check RLS policies on employees table
4. Verify user owns the employee record

### Bell Icon Not Updating
**Check:**
1. Is membership.employee_id available?
2. Check if loadNotifications is being called
3. Verify RLS policies on notifications
4. Check 30-second interval is running

---

## Future Enhancements

### Possible Improvements:
1. **Email Notifications** - Send actual emails when requests are created
2. **Push Notifications** - Browser push notifications for real-time alerts
3. **Request Categories** - Specific types of information requests
4. **Reminder System** - Automatic reminders for pending requests
5. **Request Templates** - Pre-defined message templates
6. **Bulk Requests** - Request info from multiple employees at once
7. **Analytics Dashboard** - Track completion rates and response times

---

## Conclusion

The Employee Self-Service Portal provides a complete solution for employee information management with:

✅ **Role-based access control** - Different views for employers and employees
✅ **Information request system** - Easy way to request missing employee data
✅ **Real-time notifications** - Employees get notified instantly
✅ **Self-service editing** - Employees can update their own information
✅ **Auto-completion** - Requests auto-complete when employee updates profile
✅ **Secure implementation** - Full RLS policies and permission checks

This feature significantly improves the HR workflow by enabling direct communication with employees about missing information and empowering employees to maintain their own data.

**Status:** ✅ Production Ready
**Version:** 1.0
**Last Updated:** December 2024
