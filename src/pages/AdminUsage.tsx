import { useEffect, useMemo, useState } from 'react';
import { getClients, getInvoices } from '../utils/billingStorage';
import { getBudgets, getRecurringExpenses } from '../utils/storage';
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import type { UserLimits } from '../types/superAdmin';

const UsageBar = ({ used, limit }: { used: number; limit: number }) => {
  const safeLimit = Math.max(limit, 1);
  const percentage = Math.min((used / safeLimit) * 100, 100);
  const overLimit = used > limit;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white/85">
        <span>{used} used</span>
        <span>{limit} total</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all ${overLimit ? 'bg-red-400' : 'bg-green-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {overLimit ? <p className="mt-2 text-xs text-red-300">Over plan limit</p> : null}
    </div>
  );
};

export const AdminUsage = () => {
  const [loading, setLoading] = useState(true);
  const [clientCount, setClientCount] = useState(0);
  const [invoicesThisMonth, setInvoicesThisMonth] = useState(0);
  const [budgetsThisMonth, setBudgetsThisMonth] = useState(0);
  const [recurringTemplateCount, setRecurringTemplateCount] = useState(0);
  const [limits, setLimits] = useState<UserLimits>({
    plan: 'Free',
    clients: 1,
    invoicesPerMonth: 2,
    budgetsPerMonth: 1,
    recurringTemplates: 5,
  });
  const currentPlan = useMemo(() => limits.plan, [limits.plan]);

  useEffect(() => {
    const loadUsage = async () => {
      setLoading(true);

      const [clients, invoices, budgets, recurringTemplates, userLimits] = await Promise.all([
        getClients(),
        getInvoices(),
        getBudgets(),
        getRecurringExpenses(),
        getCurrentUserLimits(),
      ]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const invoicesUsed = invoices.filter((invoice) => {
        const created = new Date(invoice.dateCreated);
        return created >= monthStart && created < nextMonthStart;
      }).length;

      const budgetsUsed = budgets.filter((budget) => {
        const created = new Date(budget.dateCreated);
        return created >= monthStart && created < nextMonthStart;
      }).length;

      setClientCount(clients.length);
      setInvoicesThisMonth(invoicesUsed);
      setBudgetsThisMonth(budgetsUsed);
      setRecurringTemplateCount(recurringTemplates.length);
      setLimits(userLimits);
      setLoading(false);
    };

    loadUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading usage...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/80">
        Current plan: <span className="font-bold text-white">{currentPlan}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-dark rounded-xl p-6">
          <h2 className="mb-2 text-lg font-bold">Clients</h2>
          <p className="mb-4 text-sm text-white/70">How many clients you currently have</p>
          <UsageBar used={clientCount} limit={limits.clients} />
        </div>

        <div className="glass-dark rounded-xl p-6">
          <h2 className="mb-2 text-lg font-bold">Invoices This Month</h2>
          <p className="mb-4 text-sm text-white/70">Used this month out of your invoicing plan limit</p>
          <UsageBar used={invoicesThisMonth} limit={limits.invoicesPerMonth} />
        </div>

        <div className="glass-dark rounded-xl p-6">
          <h2 className="mb-2 text-lg font-bold">Budgets This Month</h2>
          <p className="mb-4 text-sm text-white/70">Used this month out of your budgets plan limit</p>
          <UsageBar used={budgetsThisMonth} limit={limits.budgetsPerMonth} />
        </div>

        <div className="glass-dark rounded-xl p-6">
          <h2 className="mb-2 text-lg font-bold">Recurring Expense Templates</h2>
          <p className="mb-4 text-sm text-white/70">Number of recurring expense templates saved</p>
          <UsageBar used={recurringTemplateCount} limit={limits.recurringTemplates} />
        </div>
      </div>
    </div>
  );
};
