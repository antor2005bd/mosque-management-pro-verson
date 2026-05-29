-- ====================================================================
-- MOSQUE MANAGEMENT SYSTEM - SUPABASE INITIAL SAMPLE DATA INSERTION
-- ====================================================================
-- This SQL script inserts sample data into your database tables.
-- You can run this directly in the Supabase SQL Editor.
-- IMPORTANT: Make sure you have already run the 'SUPABASE_SETUP.sql' script!

-- Clear any existing data first to prevent duplicates (Optional)
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE members RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;


-- ==========================================
-- 1. INSERT USERS (ইউজার এন্ট্রি)
-- ==========================================
-- Admin password hash corresponds to: "password123"
-- Data Entry User password hash corresponds to: "password123"
INSERT INTO users (username, password, name, mobile, role, status)
VALUES 
  (
    'admin', 
    '$2a$10$3K2K8qY7X8z/8iYIdv8XreJbe3p68wGshfbyI6jZk5rscI.G.e3wG', -- password123
    'হাফেজ মাওলানা ওবায়দুল্লাহ', 
    '01712345678', 
    'Admin', 
    'Active'
  ),
  (
    'operator', 
    '$2a$10$3K2K8qY7X8z/8iYIdv8XreJbe3p68wGshfbyI6jZk5rscI.G.e3wG', -- password123
    'মোঃ আবুল কাশেম', 
    '01812345678', 
    'Data Entry User', 
    'Active'
  );


-- ==========================================
-- 2. INSERT MEMBERS (মসজিদ সদস্য এন্ট্রি)
-- ==========================================
INSERT INTO members (name, mobile, monthly_amount, start_month, status)
VALUES
  ('আব্দুল হামিদ মুন্সী', '01901234567', 100.00, '2026-01', 'Active'),
  ('আলহাজ্ব নজরুল ইসলাম', '01501234567', 200.00, '2026-01', 'Active'),
  ('মোঃ আরমান সাহেব', '01301234567', 150.00, '2026-02', 'Active'),
  ('সোলায়মান রহমান', '01701234567', 100.00, '2026-03', 'Active');


-- ==========================================
-- 3. INSERT TRANSACTIONS (লেনদেন এন্ট্রি)
-- ==========================================
-- Sample Transactions (Income & Expenses, Approved & Pending)
INSERT INTO transactions (type, source, member_id, amount, date, month, payment_method, status, entry_by, approved_by, notes)
VALUES
  -- 1. Chanda payment (January 2026 for Abdul Hamid, Approved by Admin)
  (
    'Income', 
    'Chanda', 
    1, -- Abdul Hamid (member_id)
    100.00, 
    '2026-01-10', 
    '2026-01', 
    'Cash', 
    'Approved', 
    2, -- entry_by (operator)
    1, -- approved_by (admin)
    'জানুয়ারি মাসের মাসিক চাঁদা আদায়'
  ),

  -- 2. Chanda payment (February 2026 for Abdul Hamid, Pending Approval)
  (
    'Income', 
    'Chanda', 
    1, -- Abdul Hamid (member_id)
    100.00, 
    '2026-02-12', 
    '2026-02', 
    'Cash', 
    'Pending', 
    2, -- entry_by (operator)
    NULL, 
    'ফেব্রুয়ারি মাসের চাঁদা পরিশোধের আবেদন'
  ),

  -- 3. Juma/General Donation (Approved)
  (
    'Income', 
    'Donation', 
    NULL, 
    1550.00, 
    '2026-05-23', 
    NULL, 
    'Cash', 
    'Approved', 
    2, 
    1, 
    'শুক্রবার জুমার নামাজের সাধারণ দান বাক্স'
  ),

  -- 4. Rice Tuma Sale (Approved)
  (
    'Income', 
    'Rice Tuma', 
    NULL, 
    1200.00, 
    '2026-05-24', 
    NULL, 
    'Cash', 
    'Approved', 
    2, 
    1, 
    '৪০ কেজি মুষ্টি চাল বিক্রয় (৩০ টাকা হারে)'
  ),

  -- 5. Expense: Imam Salary (Approved)
  (
    'Expense', 
    'Salary', 
    NULL, 
    8000.00, 
    '2026-05-05', 
    NULL, 
    'Cash', 
    'Approved', 
    1, -- entered by admin directly
    1, -- pre-approved by admin
    'মে মাসের ইমাম সাহেবের সম্মানী ভাতা'
  ),

  -- 6. Expense: Utility Bills (Pending Approval)
  (
    'Expense', 
    'Utility', 
    NULL, 
    1850.00, 
    '2026-05-25', 
    NULL, 
    'bKash', 
    'Pending', 
    2, -- operator entered
    NULL, 
    'মে মাসের মসজিদের বিদ্যুৎ বিল পরিশোধের এন্ট্রি'
  );
