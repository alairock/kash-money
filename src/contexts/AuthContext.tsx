import { createContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
	currentUser: User | null;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
	currentUser: null,
	loading: true,
});

export { AuthContext };

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUser(user);
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const value = useMemo(
		() => ({
			currentUser,
			loading,
		}),
		[currentUser, loading]
	);

	return <AuthContext value={value}>{children}</AuthContext>;
};
