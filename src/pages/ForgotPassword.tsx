import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

export const ForgotPassword = () => {
	const [email, setEmail] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess(false);
		setLoading(true);

		try {
			await sendPasswordResetEmail(auth, email);
			setSuccess(true);
			setEmail('');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send password reset email');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
			<div className="glass-effect w-full max-w-md space-y-8 rounded-2xl p-8 shadow-2xl">
				<div>
					<h2 className="mt-6 text-center text-4xl font-black text-shadow-glow">
						Reset Password
					</h2>
					<p className="mt-2 text-center text-white/80">
						Enter your email address and we'll send you a link to reset your password.
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					{error && (
						<div className="rounded-xl bg-red-500/20 p-4 text-sm font-semibold text-red-200 backdrop-blur-sm">
							{error}
						</div>
					)}
					{success && (
						<div className="rounded-xl bg-green-500/20 p-4 text-sm font-semibold text-green-200 backdrop-blur-sm">
							Password reset email sent! Check your inbox for instructions. 📧
						</div>
					)}
					<div>
						<label htmlFor="email-address" className="sr-only">
							Email address
						</label>
						<input
							id="email-address"
							name="email"
							type="email"
							autoComplete="email"
							required
							className="relative block w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
							placeholder="Email address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<div className="space-y-3">
						<button
							type="submit"
							disabled={loading}
							className="gradient-primary group relative flex w-full justify-center rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50"
						>
							{loading ? 'Sending...' : '📧 Send reset link'}
						</button>

						<div className="text-center text-sm">
							<Link to="/login" className="font-bold text-white hover:text-white/80">
								← Back to sign in
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};
