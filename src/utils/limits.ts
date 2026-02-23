export const PLAN_LIMIT_REACHED_TOOLTIP =
  'You\'ve reached the limit included in your current plan.\nUpgrade your plan to add more.';
export const PLAN_LIMIT_REACHED_ERROR = 'PLAN_LIMIT_REACHED';

export const createPlanLimitError = () => {
  const error = new Error(PLAN_LIMIT_REACHED_TOOLTIP) as Error & { code: string };
  error.code = PLAN_LIMIT_REACHED_ERROR;
  return error;
};

export const isPlanLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === PLAN_LIMIT_REACHED_ERROR;
};

export const countItemsCreatedThisMonth = <T extends { dateCreated: string }>(items: T[]) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return items.filter((item) => {
    const created = new Date(item.dateCreated);
    return created >= monthStart && created < nextMonthStart;
  }).length;
};
