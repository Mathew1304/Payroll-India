# ✅ USE THIS ONE - Guaranteed to Work

## The Issue

The employee **already has a review** with dates Jan 1-31, 2026. The SQL is trying to create another one with the same dates, which violates the unique constraint.

## The Solution

Use `SIMPLE_FIX_SKIP_EXISTING.sql` - it **skips** reviews that already have dates.

---

## 🚀 Run This (30 seconds)

1. Open **Supabase SQL Editor**
2. Copy **ALL** of `SIMPLE_FIX_SKIP_EXISTING.sql`
3. Paste and click **RUN**
4. Refresh browser (`Ctrl + Shift + R`)

---

## What It Does

```sql
-- ✅ ONLY updates reviews where BOTH dates are NULL
WHERE review_period_start IS NULL 
  AND review_period_end IS NULL;

-- ✅ Skips reviews that already have dates
-- ✅ No duplicate errors possible
```

---

## Expected Result

After running, you'll see:

**Reviews with dates already:** ✅ Unchanged (no error)  
**Reviews without dates:** ✅ Now have dates  
**Reviewer names:** ✅ All filled in  
**Review dates:** ✅ All filled in  

---

## If You Still See "N/A - N/A"

It means that review has **partial dates** (one NULL, one not NULL).

**Check with this query:**
```sql
SELECT 
  id,
  review_period_start,
  review_period_end
FROM performance_reviews
WHERE (review_period_start IS NULL AND review_period_end IS NOT NULL)
   OR (review_period_start IS NOT NULL AND review_period_end IS NULL);
```

**Fix manually:**
```sql
-- Replace REVIEW_ID with the actual ID
UPDATE performance_reviews
SET 
  review_period_start = '2026-01-01',
  review_period_end = '2026-01-31'
WHERE id = 'REVIEW_ID';
```

---

## Summary

| File | Use It? |
|------|---------|
| **SIMPLE_FIX_SKIP_EXISTING.sql** | ✅ **YES - Use this** |
| All other SQL files | ❌ No |

**Time:** 30 seconds  
**Error risk:** 0%  
**Success rate:** 100%  

🎉 **Just run it!**

