import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SignalRProvider } from './contexts/SignalRContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import ProfilePage from './pages/ProfilePage';
import AllMoviesPage from './pages/AllMoviesPage';
import './style/App.css';
import MyListsPage from './pages/MyListsPage';
import UserPublicProfilePage from './pages/UserPublicProfilePage';
import { ThemeProvider } from './contexts/ThemeContext';
import { FriendsProvider } from './contexts/FriendsContext';
import ChatPage from './pages/ChatPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminReportsPage from './pages/AdminReportsPage';
import BlockedRoute from './components/BlockedRoute';
import HistoryPage from './pages/HistoryPage';
import TopMoviesPage from './pages/TopMoviesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserReviewsPage from './pages/UserReviewsPage';
import ActorsPage from './pages/ActorsPage';
import ActorDetailPage from './pages/ActorDetailPage';
import MovieCastPage from './pages/MovieCastPage';
import TermsPage from './pages/TermsPage';
import CookiePopup from './components/CookiePopup';
import PrivacyPage from './pages/PrivacyPage';
import Footer from './components/Footer';
import PromoBanner from './components/PromoBanner';
import ProtectedRoute from './components/ProtectedRoute';
import BlacklistPage from './pages/BlacklistPage';
import AppealPage from './pages/AppealPage';
import AdminAppealsPage from './pages/AdminAppealsPage';
import AdminCriticApplicationsPage from './pages/AdminCriticApplicationsPage';
import MoviePage from './pages/MoviePage';
import CharacterDetailPage from './pages/CharacterDetailPage';
import VoiceActorDetailPage from './pages/VoiceActorDetailPage';
import NewsBanner from './components/NewsBanner';
import NewsDetailsPage from './pages/NewsDetailsPage';
import NewsPage from './pages/NewsPage';
import AdminRolesPage from './pages/AdminRolesPage';
import CriticReviewsPage from './pages/CriticReviewsPage';
import ModeratorPage from './pages/ModeratorPage';
import TierListsPage from './pages/TierListsPage';
import TierListDetailPage from './pages/TierListDetailPage';
import EditTierListPage from './pages/EditTierListPage';
import AdminTierListModerationPage from './pages/AdminTierListModerationPage';
import ForumPage from './pages/ForumPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import ForumTopicPage from './pages/ForumTopicPage';
import AdminForumModerationPage from './pages/AdminForumModerationPage';
import MembershipPage from './pages/MembershipPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

import { useEffect } from 'react';
import { AchievementProvider } from './contexts/AchievementContext';

function App() {
  useEffect(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
  }, []);

  return (
    <SignalRProvider>
      <AuthProvider>
        <ThemeProvider>
          <FriendsProvider>
            <AchievementProvider>
              <Router>
              <div className="App">
                <PromoBanner />
                <NewsBanner />
                <Navigation />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/movie/:id" element={<MovieDetailPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/movies" element={<AllMoviesPage />} />
                  <Route path="/my-lists" element={<MyListsPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/top" element={<TopMoviesPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/my-reviews" element={<UserReviewsPage />} />
                  <Route path="/actors" element={<ActorsPage />} />
                  <Route path="/actors/:id" element={<ActorDetailPage />} />
                  <Route path="/character/:id" element={<CharacterDetailPage />} />
                  <Route path="/voice-actor/:id" element={<VoiceActorDetailPage />} />
                  <Route path="/movie/:id/cast" element={<MovieCastPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/news/:id" element={<NewsDetailsPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/movie/:id/critic-reviews" element={<CriticReviewsPage />} />
                  <Route path="/forum" element={<ForumPage />} />
                  <Route path="/forum/category/:id" element={<ForumCategoryPage />} />
                  <Route path="/forum/topic/:id" element={<ForumTopicPage />} />
                  <Route path="/admin/forum-moderation" element={<AdminForumModerationPage />} />
                  <Route path="/membership" element={<MembershipPage />} />
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route
                    path="/movies/:movieId"
                    element={
                      <BlockedRoute>
                        <MoviePage />
                      </BlockedRoute>
                    }
                  />
                  <Route path="/blacklist" element={
                    <ProtectedRoute>
                      <BlacklistPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <BlockedRoute>
                      <ChatPage />
                    </BlockedRoute>
                  } />
                  <Route path="/users/:id" element={
                    <BlockedRoute>
                      <UserPublicProfilePage />
                    </BlockedRoute>
                  } />
                  <Route path="/history" element={
                    <BlockedRoute>
                      <HistoryPage />
                    </BlockedRoute>
                  } />
                  <Route path="/admin/appeals" element={
                    <ProtectedRoute>
                      <AdminAppealsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/critic-applications" element={
                    <ProtectedRoute>
                      <AdminCriticApplicationsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/appeal" element={
                    <ProtectedRoute>
                      <AppealPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/roles" element={
                    <ProtectedRoute>
                      <AdminRolesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/moderator" element={
                    <ProtectedRoute>
                      <ModeratorPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/tierlists" element={<TierListsPage />} />
                  <Route path="/tierlists/:id" element={<TierListDetailPage />} />
                  <Route path="/tierlists/:id/edit" element={
                    <ProtectedRoute>
                      <EditTierListPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/tierlists" element={
                    <ProtectedRoute>
                      <AdminTierListModerationPage />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
              <CookiePopup />
              <Footer />
            </Router>
            </AchievementProvider>
          </FriendsProvider>
        </ThemeProvider>
      </AuthProvider>
    </SignalRProvider>
  );
}

export default App;