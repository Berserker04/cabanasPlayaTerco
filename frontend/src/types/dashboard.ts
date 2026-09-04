import type { ReservationStatus } from './reservation';

export interface DashboardPeriod {
  year: number;
  available_years: number[];
  generated_at: string;
  timezone: string;
}

export interface DashboardToday {
  occupied_cabins: number;
  operational_cabins: number;
  blocked_cabins: number;
  occupancy_rate: number;
}

export interface DashboardArrival {
  id: number;
  check_in: string;
  check_out: string;
  leader_name: string | null;
  guests_count: number;
  status: ReservationStatus;
  status_label: string;
  cabin_ids: number[];
  cabin_names: string[];
}

export interface DashboardUpcoming {
  from: string;
  to: string;
  arrivals_count: number;
  guests_count: number;
  arrivals: DashboardArrival[];
}

export interface DashboardAlerts {
  active_quotes: number;
  expiring_quotes_next_12_hours: number;
  pending_reviews: number;
  unanswered_leads: number;
}

export interface DashboardMonth {
  month: number;
  label: string;
  occupied_nights: number;
  operational_nights: number;
  occupancy_rate: number;
  reservations_count: number;
  guests_count: number;
}

export interface DashboardOperations {
  period: DashboardPeriod;
  today: DashboardToday;
  next_7_days: DashboardUpcoming;
  alerts: DashboardAlerts;
  months: DashboardMonth[];
}
