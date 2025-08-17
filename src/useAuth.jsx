import { useState, useEffect, useCallback } from 'react';
import { checkSession, logout as apiLogout } from './pages/apis/api';

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await checkSession();
            if (res === 200) {
                setIsAuthenticated(true);
            } else {
                logout()
            }
        } catch (error) {
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const logout = async () => {
        try {
            await apiLogout();
            setIsAuthenticated(false);
        } catch (error) {
            console.error("Gagal logout:", error);
        }
    };

    return { isAuthenticated, isLoading, logout };
};

export default useAuth;
