-- Check if there are any leave applications in the database
-- Run this in Supabase SQL Editor to see what data exists

SELECT 
    la.id,
    la.employee_id,
    la.organization_id,
    la.start_date,
    la.end_date,
    la.days,
    la.status,
    la.created_at,
    e.first_name,
    e.last_name,
    lt.name as leave_type
FROM leave_applications la
LEFT JOIN employees e ON la.employee_id = e.id
LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
ORDER BY la.created_at DESC
LIMIT 20;
