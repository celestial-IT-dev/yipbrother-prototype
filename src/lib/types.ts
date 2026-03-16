import type { Role, OrderStatus } from './constants';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  vehicle_reg: string | null;
  chassis_number: string | null;
  vehicle_model: string | null;
  vehicle_type: string | null;
  body_type: string | null;
  dimensions: string | null;
  special_requirements: string | null;
  production_notes: string | null;
  target_completion_date: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  customer_confirmation_date: string | null;
  engineering_release_date: string | null;
  materials_ready_date: string | null;
  production_start_date: string | null;
  inspection_date: string | null;
  sign_off_date: string | null;
  payment_remarks: string | null;
  initial_payment_status: string | null;
  final_payment_status: string | null;
  invoice_reference: string | null;
  delivery_method: string | null;
  delivery_remarks: string | null;
  current_status: OrderStatus;
  salesperson_id: string | null;
  is_archived?: boolean | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: Pick<Profile, 'full_name' | 'role'> | null;
}

export interface OrderHistoryEntry {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  remark: string | null;
  created_at: string;
  profiles: Pick<Profile, 'full_name' | 'role'> | null;
}

export interface OrderAttachment {
  id: string;
  order_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  public_url: string;
  storage_path: string;
  status_context: string | null;
  created_at: string;
  uploaded_by: string | null;
  profiles?: Pick<Profile, 'full_name'> | null;
}

