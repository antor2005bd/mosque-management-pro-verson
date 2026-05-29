export interface User {
  id: number;
  username: string;
  name: string;
  mobile?: string;
  role: 'Admin' | 'Data Entry User';
  status: 'Active' | 'Inactive';
}

export interface Member {
  id: number;
  name: string;
  mobile: string;
  monthly_amount: number;
  start_month: string;
  status: 'Active' | 'Inactive';
  total_paid?: number;
  paid_months?: string[];
  pending_months?: string[];
}

export interface Transaction {
  id: number;
  type: 'Income' | 'Expense';
  source: string;
  member_id?: number;
  member_name?: string;
  amount: number;
  date: string;
  month?: string;
  payment_method?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  entry_by: number;
  entry_by_name: string;
  approved_by?: number;
}

export interface FundSummary {
  totalFund: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalIncome: number;
  totalExpense: number;
  totalDues?: number;
}
