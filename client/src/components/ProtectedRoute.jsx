import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }) {
  const { token, fetchMe, user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && !user) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user, fetchMe]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
  return children;
}
