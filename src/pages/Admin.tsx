import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';

export const Admin = () => {
  const location = useLocation();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 px-4 py-3 rounded-lg text-center text-sm font-semibold transition-all md:flex-none md:px-6 ${
      isActive
        ? 'glass-effect text-white shadow-lg'
        : 'text-white/80 hover:text-white hover:glass-dark'
    }`;

  if (location.pathname === '/admin') {
    return <Navigate to="/admin/profile" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8 pb-28 md:pb-8">
      <div className="mb-8">
        <h1 className="mb-6 text-4xl font-black text-shadow-glow">⚙️ Admin</h1>

        <div className="glass-dark fixed bottom-4 left-4 right-4 z-40 flex gap-2 rounded-xl p-2 md:static md:inline-flex md:w-auto">
          <NavLink to="/admin/profile" className={linkClass}>
            Profile
          </NavLink>
          <NavLink to="/admin/billing" className={linkClass}>
            Billing
          </NavLink>
          <NavLink to="/admin/usage" className={linkClass}>
            Usage
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
};
