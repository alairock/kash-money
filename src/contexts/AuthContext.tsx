import { createContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { checkSuperAdminAccess, isSuperAdminEmail } from '../utils/superAdminStorage';

interface AuthContextType {
	currentUser: User | null;
	loading: boolean;
	isSuperAdmin: boolean;
	canAccessSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
	currentUser: null,
	loading: true,
	isSuperAdmin: false,
	canAccessSuperAdmin: false,
});

export { AuthContext };

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [canAccessSuperAdmin, setCanAccessSuperAdmin] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUser(user);

			if (isSuperAdminEmail(user?.email)) {
				checkSuperAdminAccess()
					.then((hasAccess) => setCanAccessSuperAdmin(hasAccess))
					.catch((error) => {
						console.error('Failed super admin access check:', error);
						setCanAccessSuperAdmin(false);
					});
			} else {
				setCanAccessSuperAdmin(false);
			}
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const value = useMemo(
		() => ({
			currentUser,
			loading,
			isSuperAdmin: isSuperAdminEmail(currentUser?.email),
			canAccessSuperAdmin,
		}),
		[currentUser, loading, canAccessSuperAdmin]
	);

	return <AuthContext value={value}>{children}</AuthContext>;
};
