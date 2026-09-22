import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CastProvider } from '@/lib/CastContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from '@/pages/Home';
import Watch from '@/pages/Watch';
import Admin from '@/pages/Admin';
import SeriesDetail from '@/pages/SeriesDetail';
import Search from '@/pages/Search';
import FranchiseDetail from '@/pages/FranchiseDetail';
import MovieDetail from '@/pages/MovieDetail';
import Dashboard from '@/pages/Dashboard';
import Donate from '@/pages/Donate';
import Leaks from '@/pages/Leaks';
import LeaksSection from '@/pages/LeaksSection';
import CastPlayer from '@/pages/CastPlayer';
import Books from '@/pages/Books';
import PurchaseCallback from '@/pages/PurchaseCallback';
import DownloadProxy from '@/pages/DownloadProxy';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import { DownloadManagerProvider } from '@/lib/DownloadManagerContext';
import DownloadManagerPopup from '@/components/browse/DownloadManagerPopup';
import { PremiumModalProvider } from '@/lib/PremiumModalContext';
import PremiumModal from '@/components/browse/PremiumModal';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (user?.theme_color) {
      const root = document.documentElement;
      const color = user.theme_color;
      if (color === 'blue') { root.style.setProperty('--primary', '221.2 83.2% 53.3%'); root.style.setProperty('--ring', '221.2 83.2% 53.3%'); }
      else if (color === 'green') { root.style.setProperty('--primary', '142.1 76.2% 36.3%'); root.style.setProperty('--ring', '142.1 76.2% 36.3%'); }
      else if (color === 'purple') { root.style.setProperty('--primary', '262.1 83.3% 57.8%'); root.style.setProperty('--ring', '262.1 83.3% 57.8%'); }
      else if (color === 'orange') { root.style.setProperty('--primary', '24.6 95% 53.1%'); root.style.setProperty('--ring', '24.6 95% 53.1%'); }
      else { root.style.setProperty('--primary', '0 72% 51%'); root.style.setProperty('--ring', '0 72% 51%'); }
    }
  }, [user?.theme_color]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  if (user?.is_banned) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-black text-destructive mb-2">Account Suspended</h1>
        <p className="text-muted-foreground mb-6">Your account has been banned from accessing this site.</p>
      </div>
    );
  }

  // Render the main app
  return (
    <>
    <PremiumModalProvider>
    <DownloadManagerProvider>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/watch" element={<Watch />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/series" element={<SeriesDetail />} />
      <Route path="/search" element={<Search />} />
      <Route path="/franchise" element={<FranchiseDetail />} />
      <Route path="/movie" element={<MovieDetail />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/donate" element={<Donate />} />
      <Route path="/leaks" element={<Leaks />} />
      <Route path="/leaks/section" element={<LeaksSection />} />
      <Route path="/cast" element={<CastPlayer />} />
      <Route path="/books" element={<Books />} />
      <Route path="/callback" element={<PurchaseCallback />} />
      <Route path="/dl/:type/:id/*" element={<DownloadProxy />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    <DownloadManagerPopup />
    </DownloadManagerProvider>
    <PremiumModal />
    </PremiumModalProvider>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <CastProvider>
            <AuthenticatedApp />
          </CastProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App