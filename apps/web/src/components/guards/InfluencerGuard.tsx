import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

interface Props {
  children: React.ReactNode;
}

export default function InfluencerGuard({ children }: Props) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || user?.role !== 'INFLUENCER') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
