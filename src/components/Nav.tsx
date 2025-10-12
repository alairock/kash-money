import { NavLink } from 'react-router-dom';

export const Nav = () => {
	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`;

	return (
		<nav className="w-full bg-gray-800 p-4">
			<div className="mx-auto flex max-w-4xl items-center justify-start gap-4">
				<NavLink to="/budgets" className={linkClass}>
					Budgets
				</NavLink>
				<NavLink to="/config" className={linkClass}>
					Config
				</NavLink>
			</div>
		</nav>
	);
};
