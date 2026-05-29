-- ====================================================================
-- MOSQUE MANAGEMENT SYSTEM - SUPABASE DATABASE INITIALIZATION SCHEMA
-- ====================================================================
-- Copy and paste this script into your Supabase SQL Editor to set up
-- the required tables. This script drops existing tables first to ensure
-- a clean and consistent schema matching our server.ts code.

-- 1. Clean up existing tables and indexes (Safe recreate)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  role TEXT NOT NULL, -- 'Admin', 'Data Entry User'
  status TEXT NOT NULL DEFAULT 'Active' -- 'Active', 'Inactive'
);

-- 3. Create Members Table
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  monthly_amount NUMERIC(12, 2) NOT NULL,
  start_month TEXT NOT NULL, -- Format: YYYY-MM
  status TEXT NOT NULL DEFAULT 'Active' -- 'Active', 'Inactive'
);

-- 4. Create Transactions Table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'Income', 'Expense'
  source TEXT NOT NULL, -- e.g. 'Chanda', 'Rice Tuma', 'Donation', 'Salary', 'Utility' etc.
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  month TEXT, -- Format: YYYY-MM (for Chanda payments)
  payment_method TEXT, -- e.g. 'Cash', 'bKash', 'Nagad', 'Bank'
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  entry_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT
);

-- 5. Disable Row Level Security (RLS) & Add Fail-Safe Policies
-- Since security is handled at the API layer in server.ts via JWT, we disable RLS.
-- Plus, to be absolutely bulletproof, we also create "Permit All" policies so that 
-- even if RLS is enabled or forced by Supabase, the server can read/write data seamlessly.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Dynamic RLS enable/disable might fail depending on permissions, so let's define policies
-- as an extra strong safety net. Even if RLS gets re-enabled, these allow full access.
DROP POLICY IF EXISTS "Permit All Users Operations" ON users;
CREATE POLICY "Permit All Users Operations" ON users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permit All Members Operations" ON members;
CREATE POLICY "Permit All Members Operations" ON members FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permit All Transactions Operations" ON transactions;
CREATE POLICY "Permit All Transactions Operations" ON transactions FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_by ON transactions(entry_by);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
