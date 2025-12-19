-- Simple check: What is the current user's profile?
SELECT * FROM user_profiles WHERE user_id = auth.uid();
