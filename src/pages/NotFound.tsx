import { Link } from 'react-router-dom';

export const NotFound = () => {
	return (
		<main className="mx-auto max-w-4xl p-8 text-center">
			<div className="glass-effect rounded-2xl p-12 shadow-2xl">
				<h2 className="mb-4 text-5xl font-black text-shadow-glow">404 — Not Found</h2>
				<p className="mb-6 text-xl text-white/80">We couldn't find the page you're looking for. 🤷‍♂️</p>
				<Link
					to="/"
					className="gradient-primary inline-block rounded-xl px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
				>
					🏠 Go Home
				</Link>
			</div>
		</main>
	);
};
