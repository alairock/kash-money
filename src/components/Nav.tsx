import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

export const Nav = () => {
	const { currentUser } = useAuth();
	const navigate = useNavigate();

	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`;

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate('/login');
		} catch (error) {
			console.error('Failed to log out:', error);
		}
	};

	return (
		<nav className="w-full bg-gray-800 p-4">
			<div className="mx-auto flex max-w-4xl items-center justify-between">
				<div className="flex items-center gap-4">
					{currentUser && (
						<>
							<NavLink to="/budgets" className={linkClass}>
								Budgets
							</NavLink>
							<NavLink to="/config" className={linkClass}>
								Config
							</NavLink>
						</>
					)}
				</div>
				<div className="flex items-center gap-4">
					{currentUser ? (
						<>
							<span className="text-sm text-gray-400">{currentUser.email}</span>
							<button
								type="button"
								onClick={handleLogout}
								className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
							>
								Logout
							</button>
						</>
					) : (
						<NavLink to="/login" className={linkClass}>
							Login
						</NavLink>
					)}
				</div>
			</div>
		</nav>
	);
};
