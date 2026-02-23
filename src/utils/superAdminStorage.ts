import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../config/firebase';
import type { PlanName, SuperAdminClient, SuperAdminDashboardStats, UserLimits } from '../types/superAdmin';

const SUPER_ADMIN_EMAILS = ['sblnog@gmail.com'];

export const isSuperAdminEmail = (email?: string | null) =>
  !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());

const DEFAULT_LIMITS_BY_PLAN: Record<PlanName, UserLimits> = {
  Free: { plan: 'Free', clients: 1, invoicesPerMonth: 2, budgetsPerMonth: 1, recurringTemplates: 5 },
  Basic: { plan: 'Basic', clients: 5, invoicesPerMonth: 10, budgetsPerMonth: 5, recurringTemplates: 25 },
  Pro: { plan: 'Pro', clients: 50, invoicesPerMonth: 100, budgetsPerMonth: 20, recurringTemplates: 100 },
  Advanced: { plan: 'Advanced', clients: 1000, invoicesPerMonth: 1000, budgetsPerMonth: 100, recurringTemplates: 1000 },
};

export const getDefaultLimitsForPlan = (plan: PlanName): UserLimits => DEFAULT_LIMITS_BY_PLAN[plan];

export const checkSuperAdminAccess = async (): Promise<boolean> => {
  if (!isSuperAdminEmail(auth.currentUser?.email)) {
    return false;
  }

  try {
    const ping = httpsCallable(functions, 'superAdminAccessPing');
    await ping();
    return true;
  } catch (error) {
    console.error('Super admin access check failed:', error);
    return false;
  }
};

export const getAllClientsForSuperAdmin = async (): Promise<SuperAdminClient[]> => {
  const callable = httpsCallable<object, { clients: SuperAdminClient[] }>(functions, 'getSuperAdminClients');
  const response = await callable({});
  return response.data.clients;
};

export const getSuperAdminDashboardStats = async (): Promise<SuperAdminDashboardStats> => {
  const callable = httpsCallable<object, SuperAdminDashboardStats>(functions, 'getSuperAdminDashboardStats');
  const response = await callable({});
  return response.data;
};

export const updateClientLimits = async (uid: string, limits: UserLimits) => {
  const callable = httpsCallable<{ uid: string; limits: UserLimits }, { success: boolean }>(
    functions,
    'updateSuperAdminClientLimits'
  );
  await callable({ uid, limits });
};

export const getCurrentUserLimits = async (): Promise<UserLimits> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return getDefaultLimitsForPlan('Free');
  }

  const limitsDoc = await getDoc(doc(db, 'users', uid, 'settings', 'limits'));
  const overrideData = limitsDoc.exists() ? (limitsDoc.data() as Partial<UserLimits>) : null;
  const plan = overrideData?.plan ?? 'Free';
  const defaults = getDefaultLimitsForPlan(plan);

  return {
    plan,
    clients: overrideData?.clients ?? defaults.clients,
    invoicesPerMonth: overrideData?.invoicesPerMonth ?? defaults.invoicesPerMonth,
    budgetsPerMonth: overrideData?.budgetsPerMonth ?? defaults.budgetsPerMonth,
    recurringTemplates: overrideData?.recurringTemplates ?? defaults.recurringTemplates,
  };
};
