import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Budgets } from './pages/Budgets';
import { BudgetView } from './pages/BudgetView';
import { Config } from './pages/Config';
import { NotFound } from './pages/NotFound';

export const App = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav />
      <Routes>
        <Route path="/" element={<Budgets />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/budgets/:id" element={<BudgetView />} />
        <Route path="/config" element={<Config />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};
