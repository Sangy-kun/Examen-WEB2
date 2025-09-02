export interface User {
  id: number;
  username: string;
  email: string;
  profile_picture?: string;
  dark_mode: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  color: string;
  user_id?: number;
  is_global?: boolean;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number;
  category_name: string;
  category_color: string;
  type: 'one-time' | 'recurring';
  start_date?: string;
  end_date?: string;
  receipt_path?: string;
  user_id: number;
  created_at: string;
}

export interface Income {
  id: number;
  amount: number;
  description: string;
  source: string;
  date: string;
  category_id: number;
  category_name: string;
  category_color: string;
  user_id: number;
  created_at: string;
}

export interface MonthlyData {
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  balance: number;
  category_expenses: Array<{
    category_name: string;
    category_color: string;
    amount: number;
  }>;
  category_incomes: Array<{
    category_name: string;
    category_color: string;
    amount: number;
  }>;
  monthly_evolution: Array<{
    month: number;
    year: number;
    total: number;
  }>;
}

export interface Alert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

