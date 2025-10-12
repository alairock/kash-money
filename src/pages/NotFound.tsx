import { Link } from 'react-router-dom';

export const NotFound = () => {
	return (
		<main className="mx-auto max-w-4xl p-8 text-center">
			<h2 className="mb-4 text-2xl font-bold">404 — Not Found</h2>
			<p className="mb-4 text-gray-300">We couldn't find the page you're looking for.</p>
			<Link to="/" className="rounded bg-gray-700 px-4 py-2 text-white">
				Go home
			</Link>
		</main>
	);
};
