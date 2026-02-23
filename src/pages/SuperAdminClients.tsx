import { useEffect, useMemo, useState } from 'react';
import type { SuperAdminClient, UserLimits } from '../types/superAdmin';
import type { PlanName } from '../types/superAdmin';
import { getAllClientsForSuperAdmin, getDefaultLimitsForPlan, updateClientLimits } from '../utils/superAdminStorage';

const MetricBar = ({ used, limit }: { used: number; limit: number }) => {
  const percent = Math.min((used / Math.max(limit, 1)) * 100, 100);
  const isOver = used > limit;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Used: {used}</span>
        <span>Limit: {limit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${isOver ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export const SuperAdminClients = () => {
  const [clients, setClients] = useState<SuperAdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<UserLimits | null>(null);

  const editingClient = useMemo(
    () => clients.find((client) => client.uid === editingUid) ?? null,
    [clients, editingUid]
  );

  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllClientsForSuperAdmin();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const startEditing = (client: SuperAdminClient) => {
    setEditingUid(client.uid);
    setEditForm({ ...client.limits });
  };

  const handlePlanChange = (plan: PlanName) => {
    const defaults = getDefaultLimitsForPlan(plan);
    setEditForm(defaults);
  };

  const handleSave = async () => {
    if (!editingUid || !editForm) return;
    setSaving(true);
    try {
      await updateClientLimits(editingUid, editForm);
      setEditingUid(null);
      setEditForm(null);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl bg-red-500/20 p-4 text-sm text-red-200">{error}</div> : null}

      {clients.length === 0 ? (
        <div className="rounded-xl bg-white/5 p-6 text-white/70">No clients found.</div>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <div key={client.uid} className="glass-effect rounded-2xl p-5 shadow-xl sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold">{client.displayName || 'Unnamed User'}</h2>
                  <p className="truncate text-sm text-white/75">{client.email}</p>
                  <p className="mt-1 text-xs text-white/50">UID: {client.uid}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(client)}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20"
                >
                  Edit
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">Usage</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-sm">Clients</p>
                      <MetricBar used={client.usage.clients} limit={client.limits.clients} />
                    </div>
                    <div>
                      <p className="mb-1 text-sm">Invoices (This Month)</p>
                      <MetricBar used={client.usage.invoicesThisMonth} limit={client.limits.invoicesPerMonth} />
                    </div>
                    <div>
                      <p className="mb-1 text-sm">Budgets (This Month)</p>
                      <MetricBar used={client.usage.budgetsThisMonth} limit={client.limits.budgetsPerMonth} />
                    </div>
                    <div>
                      <p className="mb-1 text-sm">Recurring Templates</p>
                      <MetricBar used={client.usage.recurringTemplates} limit={client.limits.recurringTemplates} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">Limits</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-white/70">Plan</p>
                    <p className="font-semibold">{client.limits.plan}</p>
                    <p className="text-white/70">Clients</p>
                    <p className="font-semibold">{client.limits.clients}</p>
                    <p className="text-white/70">Invoices / month</p>
                    <p className="font-semibold">{client.limits.invoicesPerMonth}</p>
                    <p className="text-white/70">Budgets / month</p>
                    <p className="font-semibold">{client.limits.budgetsPerMonth}</p>
                    <p className="text-white/70">Recurring templates</p>
                    <p className="font-semibold">{client.limits.recurringTemplates}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingClient && editForm ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-effect w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Edit Limits</h2>
            <p className="mt-1 text-sm text-white/70">{editingClient.email}</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => handlePlanChange(e.target.value as PlanName)}
                  className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Free">Free</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Clients</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.clients}
                    onChange={(e) => setEditForm({ ...editForm, clients: Number(e.target.value) })}
                    className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Invoices / month</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.invoicesPerMonth}
                    onChange={(e) => setEditForm({ ...editForm, invoicesPerMonth: Number(e.target.value) })}
                    className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Budgets / month</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.budgetsPerMonth}
                    onChange={(e) => setEditForm({ ...editForm, budgetsPerMonth: Number(e.target.value) })}
                    className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Recurring templates</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.recurringTemplates}
                    onChange={(e) => setEditForm({ ...editForm, recurringTemplates: Number(e.target.value) })}
                    className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingUid(null);
                  setEditForm(null);
                }}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
