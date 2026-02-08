import { NavLink, Outlet } from 'react-router-dom';

export const Billing = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
      isActive
        ? 'glass-effect text-white shadow-lg'
        : 'text-white/80 hover:text-white hover:glass-dark'
    }`;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <h1 className="mb-6 text-4xl font-black text-shadow-glow">📄 Billing</h1>

        <div className="glass-dark p-2 rounded-xl inline-flex gap-2">
          <NavLink to="/billing/invoices" className={linkClass}>
            Invoices
          </NavLink>
          <NavLink to="/billing/clients" className={linkClass}>
            Clients
          </NavLink>
          <NavLink to="/billing/settings" className={linkClass}>
            Settings
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
};
