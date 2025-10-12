import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

export const Nav = () => {
	const { currentUser } = useAuth();
	const navigate = useNavigate();

	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'glass-effect text-white shadow-lg' : 'text-white/80 hover:text-white hover:glass-dark'}`;

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate('/login');
		} catch (error) {
			console.error('Failed to log out:', error);
		}
	};

	return (
		<nav className="w-full glass-dark p-4 shadow-xl">
			<div className="mx-auto flex max-w-6xl items-center justify-between">
				<div className="flex items-center gap-6">
					<h1 className="text-2xl font-black text-shadow-glow">
						KashMoney🤑
					</h1>
					{currentUser && (
						<>
							<NavLink to="/budgets" className={linkClass}>
								💰 Budgets
							</NavLink>
							<NavLink to="/config" className={linkClass}>
								⚙️ Config
							</NavLink>
						</>
					)}
				</div>
				<div className="flex items-center gap-4">
					{currentUser ? (
						<>
							<span className="text-sm text-white/70">{currentUser.email}</span>
							<button
								type="button"
								onClick={handleLogout}
								className="rounded-lg px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:text-white hover:glass-dark"
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
