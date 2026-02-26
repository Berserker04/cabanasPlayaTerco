export type PaymentMethod = 'cash' | 'transfer' | 'nequi' | 'daviplata' | 'credit_card' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'partial';

export interface PaymentIncome {
  id: number;
  guest_group_id: number;
  reservation_id: number | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface StaffPayment {
  id: number;
  staff_id: number;
  amount: number;
  concept: string;
  payment_date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
}
