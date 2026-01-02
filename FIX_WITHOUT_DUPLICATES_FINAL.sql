-- ULTIMATE FIX: Handle Multiple Reviews Per Employee
-- This ensures each review gets UNIQUE period dates

-- ============================================================
-- STEP 1: See what we're dealing with
-- ============================================================

SELECT 
  '=== ALL REVIEWS FOR EMPLOYEE ===' as info,
  pr.id,
  e.first_name || ' ' || e.last_name as employee,
  pr.review_period_start,
  pr.review_period_end,
  pr.created_at,
  ROW_NUMBER() OVER (PARTITION BY pr.employee_id ORDER BY pr.created_at) as review_number
FROM performance_reviews pr
LEFT JOIN employees e ON e.id = pr.employee_id
WHERE pr.employee_id = 'dea84837-2d36-432c-a226-ad050dfe38c9'
ORDER BY pr.created_at;

-- ============================================================
-- STEP 2: Update ONLY reviews with NULL dates
-- Give each review a UNIQUE period based on its row number
-- ============================================================

WITH numbered_reviews AS (
  SELECT 
    id,
    employee_id,
    created_at,
    review_period_start,
    review_period_end,
    ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY created_at) as rn
  FROM performance_reviews
  WHERE review_period_start IS NULL 
    OR review_period_end IS NULL
)
UPDATE performance_reviews pr
SET 
  review_period_start = DATE_TRUNC('month', nr.created_at)::date + ((nr.rn - 1) || ' months')::interval,
  review_period_end = (DATE_TRUNC('month', nr.created_at)::date + ((nr.rn - 1) || ' months')::interval + INTERVAL '1 month - 1 day')::date,
  updated_at = now()
FROM numbered_reviews nr
WHERE pr.id = nr.id;

-- ============================================================
-- STEP 3: Fix Missing Reviewer
-- ============================================================

UPDATE performance_reviews pr
SET 
  reviewer_id = COALESCE(
    up.employee_id,
    (SELECT id FROM employees WHERE organization_id = pr.organization_id AND is_active = true LIMIT 1)
  ),
  updated_at = now()
FROM user_profiles up
WHERE pr.reviewer_id IS NULL
  AND pr.created_by = up.user_id;

-- Catch any still without reviewer
UPDATE performance_reviews pr
SET 
  reviewer_id = (
    SELECT id FROM employees 
    WHERE organization_id = pr.organization_id 
      AND is_active = true 
    LIMIT 1
  ),
  updated_at = now()
WHERE reviewer_id IS NULL;

-- ============================================================
-- STEP 4: Fix Missing Review Dates
-- ============================================================

UPDATE performance_reviews
SET 
  reviewed_date = COALESCE(reviewed_date, reviewed_at, created_at),
  reviewed_at = COALESCE(reviewed_at, reviewed_date, created_at),
  updated_at = now()
WHERE reviewed_date IS NULL OR reviewed_at IS NULL;

-- ============================================================
-- STEP 5: Verification
-- ============================================================

SELECT 
  '=== AFTER FIX - ALL REVIEWS ===' as info,
  pr.id,
  e.first_name || ' ' || e.last_name as employee,
  TO_CHAR(pr.review_period_start, 'Mon YYYY') as period_start,
  TO_CHAR(pr.review_period_end, 'Mon YYYY') as period_end,
  r.first_name || ' ' || r.last_name as reviewer,
  TO_CHAR(pr.reviewed_date, 'DD Mon YYYY') as review_date,
  pr.created_at
FROM performance_reviews pr
LEFT JOIN employees e ON e.id = pr.employee_id
LEFT JOIN employees r ON r.id = pr.reviewer_id
ORDER BY pr.employee_id, pr.created_at;

-- ============================================================
-- STEP 6: Check for Duplicates (Should be ZERO)
-- ============================================================

SELECT 
  '=== DUPLICATE CHECK ===' as info,
  employee_id,
  review_period_start,
  review_period_end,
  COUNT(*) as count
FROM performance_reviews
WHERE review_period_start IS NOT NULL
GROUP BY employee_id, review_period_start, review_period_end
HAVING COUNT(*) > 1;

-- Should return 0 rows

-- ============================================================
-- STEP 7: Summary
-- ============================================================

SELECT 
  '=== SUMMARY ===' as report,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN review_period_start IS NOT NULL THEN 1 END) as with_start_date,
  COUNT(CASE WHEN review_period_end IS NOT NULL THEN 1 END) as with_end_date,
  COUNT(CASE WHEN reviewer_id IS NOT NULL THEN 1 END) as with_reviewer,
  COUNT(CASE WHEN reviewed_date IS NOT NULL THEN 1 END) as with_review_date,
  COUNT(DISTINCT (employee_id, review_period_start, review_period_end)) as unique_reviews
FROM performance_reviews;

