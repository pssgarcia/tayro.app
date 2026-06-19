import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import { useAuthStore, type AuthUser } from './stores/auth.store';
import AuthLayout from './components/layouts/AuthLayout';
import BrandGuard from './components/guards/BrandGuard';
import BrandLayout from './components/layouts/BrandLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterBrandPage from './pages/auth/RegisterBrandPage';
import DashboardPage from './pages/brand/DashboardPage';
import CampaignsPage from './pages/brand/CampaignsPage';
import CampaignDetailPage from './pages/brand/CampaignDetailPage';
import NewCampaignPage from './pages/brand/NewCampaignPage';
import PublicApplyPage from './pages/public/PublicApplyPage';
import InfluencerComingSoonPage from './pages/influencer/InfluencerComingSoonPage';

function BootSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-lime border-t-transparent" />
    </div>
  );
}

function AppShell() {
  const { setAuth, clearAuth, isInitialized } = useAuthStore();
  // Garante que o silent refresh dispara UMA vez, mesmo com o double-mount
  // do StrictMode em dev. Sem isso, dois /auth/refresh saem no boot.
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Silent refresh: repopula o access token via cookie httpOnly de refresh.
    // • Sucesso  → setAuth (token + user)
    // • 401      → caminho normal de quem está deslogada → clearAuth
    // • Rede/timeout → clearAuth (sem sessão utilizável)
    // setAuth e clearAuth marcam isInitialized=true — o spinner sempre sai.
    api
      .post<{ accessToken: string; user: AuthUser }>('/auth/refresh', undefined, {
        timeout: 5000,
      })
      .then((res) => setAuth(res.data.accessToken, res.data.user))
      .catch(() => clearAuth());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isInitialized) return <BootSpinner />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Rotas de autenticação — sem sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        {/* Influencer ainda em construção → /register vai direto pro cadastro de marca */}
        <Route path="/register" element={<Navigate to="/register/brand" replace />} />
        <Route path="/register/brand" element={<RegisterBrandPage />} />
      </Route>

      {/* Rotas da marca — protegidas por BrandGuard */}
      <Route
        path="/brand"
        element={
          <BrandGuard>
            <BrandLayout />
          </BrandGuard>
        }
      >
        <Route index element={<Navigate to="/brand/campaigns" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<NewCampaignPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
      </Route>

      {/* Influencer — em construção */}
      <Route path="/influencer" element={<InfluencerComingSoonPage />} />

      {/* Rota pública de inscrição — sem auth, sem layout */}
      <Route path="/apply/:id" element={<PublicApplyPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppShell />;
}
