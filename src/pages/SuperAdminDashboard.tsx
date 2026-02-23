import { useEffect, useState } from 'react';
import type { SuperAdminDashboardStats } from '../types/superAdmin';
import { getSuperAdminDashboardStats } from '../utils/superAdminStorage';

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="glass-effect rounded-2xl p-5 shadow-xl sm:p-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-white/65">{label}</p>
    <p className="mt-2 text-4xl font-black text-white">{value.toLocaleString()}</p>
  </div>
);

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<SuperAdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getSuperAdminDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl bg-red-500/20 p-5 text-sm text-red-200">
        {error || 'Unable to load dashboard data'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/70">User activity based on Firebase Auth last sign-in metadata.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Logged In Today" value={stats.loggedInToday} />
        <StatCard label="Logged In This Week" value={stats.loggedInThisWeek} />
        <StatCard label="Logged In This Month" value={stats.loggedInThisMonth} />
      </div>
    </div>
  );
};
