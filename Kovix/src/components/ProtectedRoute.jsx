import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <div>Завантаження...</div>;
    
    if (!user) return <Navigate to="/login" replace />;

    if (user.isEmailVerified === false && user.role !== 'Admin' && user.role !== 'Moderator') {
        return <Navigate to="/verify-email" replace />;
    }

    return children;
}