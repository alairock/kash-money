import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

export const Nav = () => {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef<HTMLDivElement | null>(null);
	const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'glass-effect text-white shadow-lg' : 'text-white/80 hover:text-white hover:glass-dark'}`;
	const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
		`w-full rounded-lg border px-4 py-3 text-right text-sm font-semibold transition-all ${
			isActive
				? 'glass-effect border-white/20 text-white shadow-lg'
				: 'border-transparent text-white/80 hover:border-white/10 hover:text-white hover:glass-dark'
		}`;

	const handleLogout = async () => {
		try {
			await signOut(auth);
			setMobileMenuOpen(false);
			navigate('/login');
		} catch (error) {
			console.error('Failed to log out:', error);
		}
	};

	useEffect(() => {
		if (!mobileMenuOpen) {
			return;
		}

		const handleScroll = () => {
			setMobileMenuOpen(false);
		};

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) {
				return;
			}

			if (mobileMenuRef.current?.contains(target) || mobileMenuButtonRef.current?.contains(target)) {
				return;
			}

			setMobileMenuOpen(false);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			window.removeEventListener('scroll', handleScroll);
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [mobileMenuOpen]);

	return (
		<nav className="relative z-[100] w-full border-b border-white/10 bg-black/20 p-4 shadow-xl">
			<div className="relative mx-auto max-w-6xl">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-6">
						<h1 className="text-2xl font-black text-shadow-glow">
							KashMoney🤑
						</h1>
						{currentUser && (
							<div className="hidden lg:flex items-center gap-2">
								<NavLink to="/budgets" className={linkClass}>
									💰 Budgets
								</NavLink>
								<NavLink to="/recurring-expenses" className={linkClass}>
									💸 Recurring Expenses
								</NavLink>
								<NavLink to="/billing" className={linkClass}>
									📄 Invoicing
								</NavLink>
							</div>
						)}
					</div>

					<div className="hidden lg:flex items-center gap-4">
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
							<>
								{location.pathname === '/login' || location.pathname === '/forgot-password' ? (
									<button
										type="button"
										onClick={() => navigate('/signup')}
										className="gradient-success rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
									>
										Sign up
									</button>
								) : (
									<button
										type="button"
										onClick={() => navigate('/login')}
										className="gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
									>
										Login
									</button>
								)}
							</>
						)}
					</div>

					<button
						ref={mobileMenuButtonRef}
						type="button"
						className="lg:hidden rounded-lg glass-effect px-3 py-2 text-white/80 hover:text-white"
						onClick={() => setMobileMenuOpen((prev) => !prev)}
						aria-label="Toggle navigation menu"
						aria-expanded={mobileMenuOpen}
					>
						☰
					</button>
				</div>

				{mobileMenuOpen && (
					<>
						<div
							ref={mobileMenuRef}
							className="fixed left-4 right-4 top-20 z-[110] ml-auto w-auto max-w-sm rounded-xl border border-white/15 bg-black/35 p-3 shadow-xl lg:hidden"
							style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
						>
							{currentUser ? (
								<>
									<p className="px-1 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-white/50">
										Navigation
									</p>
									<div className="flex flex-col gap-2">
										<NavLink
											to="/budgets"
											className={mobileLinkClass}
											onClick={() => setMobileMenuOpen(false)}
										>
											Budgets
										</NavLink>
										<NavLink
											to="/recurring-expenses"
											className={mobileLinkClass}
											onClick={() => setMobileMenuOpen(false)}
										>
											Recurring Expenses
										</NavLink>
										<NavLink
											to="/billing"
											className={mobileLinkClass}
											onClick={() => setMobileMenuOpen(false)}
										>
											Invoicing
										</NavLink>
									</div>

									<div className="my-3 border-t border-white/10"></div>

									<p className="px-1 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-white/50">
										Account
									</p>
									<div className="rounded-lg bg-white/5 px-3 py-2 text-right text-xs text-white/70 break-all">
										{currentUser.email}
									</div>
									<button
										type="button"
										onClick={handleLogout}
										className="mt-2 w-full rounded-lg px-4 py-2 text-right text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
									>
										Logout
									</button>
								</>
							) : (
								<>
									<p className="px-1 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-white/50">
										Account
									</p>
									{location.pathname === '/login' || location.pathname === '/forgot-password' ? (
										<button
											type="button"
											onClick={() => {
												setMobileMenuOpen(false);
												navigate('/signup');
											}}
											className="gradient-success w-full rounded-lg px-4 py-2 text-right text-sm font-semibold text-white shadow-lg transition-all"
										>
											Sign up
										</button>
									) : (
										<button
											type="button"
											onClick={() => {
												setMobileMenuOpen(false);
												navigate('/login');
											}}
											className="gradient-primary w-full rounded-lg px-4 py-2 text-right text-sm font-semibold text-white shadow-lg transition-all"
										>
											Login
										</button>
									)}
								</>
							)}
						</div>
					</>
				)}
			</div>
		</nav>
	);
};
