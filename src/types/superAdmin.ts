export type PlanName = 'Free' | 'Basic' | 'Pro' | 'Advanced';

export interface UsageSummary {
  clients: number;
  invoicesThisMonth: number;
  budgetsThisMonth: number;
  recurringTemplates: number;
}

export interface UserLimits {
  plan: PlanName;
  clients: number;
  invoicesPerMonth: number;
  budgetsPerMonth: number;
  recurringTemplates: number;
}

export interface SuperAdminClient {
  uid: string;
  email: string;
  displayName?: string;
  limits: UserLimits;
  usage: UsageSummary;
}

export interface SuperAdminDashboardStats {
  totalUsers: number;
  loggedInToday: number;
  loggedInThisWeek: number;
  loggedInThisMonth: number;
}
