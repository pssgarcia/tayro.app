import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { api } from './services/api';
import ScrollToTop from './components/ScrollToTop';
import SentryFallback from './components/SentryFallback';
import { useAuthStore, type AuthUser } from './stores/auth.store';
import AuthLayout from './components/layouts/AuthLayout';
import BrandGuard from './components/guards/BrandGuard';
import BrandLayout from './components/layouts/BrandLayout';
import InfluencerGuard from './components/guards/InfluencerGuard';
import InfluencerLayout from './components/layouts/InfluencerLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterChooserPage from './pages/auth/RegisterChooserPage';
import RegisterBrandPage from './pages/auth/RegisterBrandPage';
import RegisterInfluencerPage from './pages/influencer/RegisterInfluencerPage';
import ClaimAccountPage from './pages/auth/ClaimAccountPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/brand/DashboardPage';
import ProfilePage from './pages/brand/ProfilePage';
import CampaignsPage from './pages/brand/CampaignsPage';
import ApprovedCreatorsPage from './pages/brand/ApprovedCreatorsPage';
import CampaignDetailPage from './pages/brand/CampaignDetailPage';
import NewCampaignPage from './pages/brand/NewCampaignPage';
import EditCampaignPage from './pages/brand/EditCampaignPage';
import PublicApplyPage from './pages/public/PublicApplyPage';
import PublicCreatorProfilePage from './pages/public/PublicCreatorProfilePage';
import BrowseProgramsPublicPage from './pages/public/BrowseProgramsPublicPage';
import LandingPage from './pages/public/LandingPage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import TermsOfUsePage from './pages/public/TermsOfUsePage';
import { PRIVACY_PATH, TERMS_PATH } from './config/legal';
import MyApplicationsPage from './pages/influencer/MyApplicationsPage';
import InfluencerProfilePage from './pages/influencer/ProfilePage';
import BrowseProgramsPage from './pages/influencer/BrowseProgramsPage';
import ProgramDetailPage from './pages/influencer/ProgramDetailPage';
import InfluencerDashboardPage from './pages/influencer/DashboardPage';
import SubmissionsPage from './pages/influencer/SubmissionsPage';
import RewardsPage from './pages/influencer/RewardsPage';

// Envolve <Routes> pra instrumentar navegação (traces por rota). Inerte
// enquanto tracesSampleRate estiver baixo, mas já fica cabeado.
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

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
    <SentryRoutes>
      <Route path="/" element={<LandingPage />} />

      {/* Rotas de autenticação — sem sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterChooserPage />} />
        <Route path="/register/brand" element={<RegisterBrandPage />} />
        <Route path="/register/influencer" element={<RegisterInfluencerPage />} />
        <Route path="/claim" element={<ClaimAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="creators" element={<ApprovedCreatorsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<NewCampaignPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="campaigns/:id/edit" element={<EditCampaignPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Rotas da creator — protegidas por InfluencerGuard */}
      <Route
        path="/influencer"
        element={
          <InfluencerGuard>
            <InfluencerLayout />
          </InfluencerGuard>
        }
      >
        <Route index element={<Navigate to="/influencer/dashboard" replace />} />
        <Route path="dashboard" element={<InfluencerDashboardPage />} />
        <Route path="browse" element={<BrowseProgramsPage />} />
        <Route path="programs/:id" element={<ProgramDetailPage />} />
        <Route path="applications" element={<MyApplicationsPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="profile" element={<InfluencerProfilePage />} />
      </Route>

      {/* Vitrine pública de campanhas — sem auth, sem layout (roadmap.md, AGORA #4) */}
      <Route path="/programs" element={<BrowseProgramsPublicPage />} />

      {/* Rota pública de inscrição — sem auth, sem layout */}
      <Route path="/apply/:id" element={<PublicApplyPage />} />

      {/* Perfil público da creator (media kit) — sem auth, sem layout */}
      <Route path="/c/:handle" element={<PublicCreatorProfilePage />} />

      {/* Documentos legais — sem auth, sem layout (LGPD, Bloco 2). Os dois
          caminhos saem de config/legal.ts: definir o endereço aqui E no
          componente que linka é como uma das rotas sai em outro idioma. */}
      <Route path={PRIVACY_PATH} element={<PrivacyPolicyPage />} />
      {/* O texto dos Termos ainda não foi escrito (ver TermsOfUsePage); a
          rota existe porque as caixas de aceite linkam para cá. */}
      <Route path={TERMS_PATH} element={<TermsOfUsePage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </SentryRoutes>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <SentryFallback onReset={resetError} />}>
      <ScrollToTop />
      <AppShell />
    </Sentry.ErrorBoundary>
  );
}
