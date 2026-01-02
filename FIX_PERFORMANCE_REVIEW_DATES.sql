-- QUICK FIX: Performance Review Dates and Reviewer Display
-- Run this in Supabase SQL Editor to fix existing reviews

-- 1. Check current state of reviews
SELECT 
  'Current Review Status' as info,
  pr.id,
  e.first_name || ' ' || e.last_name as employee_name,
  pr.review_period_start,
  pr.review_period_end,
  pr.reviewed_at,
  pr.reviewed_date,
  pr.reviewer_id,
  r.first_name || ' ' || r.last_name as reviewer_name,
  CASE 
    WHEN pr.reviewed_date IS NULL AND pr.reviewed_at IS NULL THEN '❌ No review date'
    WHEN pr.reviewed_date IS NULL THEN '⚠️ Missing reviewed_date'
    WHEN pr.reviewed_at IS NULL THEN '⚠️ Missing reviewed_at'
    ELSE '✅ Both dates set'
  END as date_status,
  CASE 
    WHEN pr.reviewer_id IS NULL THEN '❌ No reviewer'
    WHEN r.id IS NULL THEN '❌ Reviewer not found'
    ELSE '✅ Reviewer OK'
  END as reviewer_status
FROM performance_reviews pr
LEFT JOIN employees e ON e.id = pr.employee_id
LEFT JOIN employees r ON r.id = pr.reviewer_id
ORDER BY pr.created_at DESC
LIMIT 20;

-- 2. Fix: Sync reviewed_date from reviewed_at for existing reviews
UPDATE performance_reviews
SET reviewed_date = reviewed_at,
    updated_at = now()
WHERE reviewed_at IS NOT NULL 
  AND reviewed_date IS NULL;

-- 3. Fix: Sync reviewed_at from reviewed_date for existing reviews
UPDATE performance_reviews
SET reviewed_at = reviewed_date,
    updated_at = now()
WHERE reviewed_date IS NOT NULL 
  AND reviewed_at IS NULL;

-- 4. Verify the fix
SELECT 
  'After Fix - Review Status' as info,
  pr.id,
  e.first_name || ' ' || e.last_name as employee_name,
  pr.review_period_start,
  pr.review_period_end,
  pr.reviewed_at,
  pr.reviewed_date,
  r.first_name || ' ' || r.last_name as reviewer_name,
  CASE 
    WHEN pr.reviewed_date IS NOT NULL AND pr.reviewed_at IS NOT NULL THEN '✅ Fixed'
    WHEN pr.reviewed_date IS NULL AND pr.reviewed_at IS NULL THEN '⚠️ Not yet reviewed'
    ELSE '⚠️ Partial data'
  END as status
FROM performance_reviews pr
LEFT JOIN employees e ON e.id = pr.employee_id
LEFT JOIN employees r ON r.id = pr.reviewer_id
ORDER BY pr.created_at DESC
LIMIT 20;

-- 5. Summary
SELECT 
  '=== SUMMARY ===' as report,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN reviewed_date IS NOT NULL THEN 1 END) as reviews_with_date,
  COUNT(CASE WHEN reviewer_id IS NOT NULL THEN 1 END) as reviews_with_reviewer,
  COUNT(CASE WHEN reviewed_date IS NULL AND reviewed_at IS NULL THEN 1 END) as reviews_pending
FROM performance_reviews;

