import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireRole?: 'user' | 'instructor';
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    // Show loading while checking auth state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role required and doesn't match - redirect to appropriate dashboard
    if (requireRole && user.role !== requireRole) {
        const redirectPath = user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};
