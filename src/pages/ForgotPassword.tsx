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
			<div className="w-full max-w-md space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
						Reset your password
					</h2>
					<p className="mt-2 text-center text-sm text-gray-400">
						Enter your email address and we'll send you a link to reset your password.
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					{error && (
						<div className="rounded-md bg-red-900/50 p-4 text-sm text-red-200">
							{error}
						</div>
					)}
					{success && (
						<div className="rounded-md bg-green-900/50 p-4 text-sm text-green-200">
							Password reset email sent! Check your inbox for instructions.
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
							className="relative block w-full rounded-md border-0 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Email address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<div className="space-y-3">
						<button
							type="submit"
							disabled={loading}
							className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
						>
							{loading ? 'Sending...' : 'Send reset link'}
						</button>

						<div className="text-center text-sm">
							<Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
								Back to sign in
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};
