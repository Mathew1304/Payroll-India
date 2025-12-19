-- Test if the RLS policy actually works
-- Run this as the admin user to see if you can see the leave applications

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
    e.employee_code,
    lt.name as leave_type_name
FROM leave_applications la
LEFT JOIN employees e ON la.employee_id = e.id
LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
ORDER BY la.created_at DESC;
