import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

interface Props {
  children: React.ReactNode;
}

export default function BrandGuard({ children }: Props) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || user?.role !== 'BRAND') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
