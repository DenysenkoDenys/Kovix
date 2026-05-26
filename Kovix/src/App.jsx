import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SignalRProvider } from './contexts/SignalRContext';
import { PresenceProvider } from './contexts/PresenceContext';
import Navigation from './components/Navigation';
import { lazy, Suspense } from 'react';
const HomePage = lazy(() => import('./pages/HomePage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
import 'bootstrap/dist/css/bootstrap.min.css';
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AllMoviesPage = lazy(() => import('./pages/AllMoviesPage'));
import './style/App.css';
const MyListsPage = lazy(() => import('./pages/MyListsPage'));
const UserPublicProfilePage = lazy(() => import('./pages/UserPublicProfilePage'));
import { ThemeProvider } from './contexts/ThemeContext';
import { FriendsProvider } from './contexts/FriendsContext';
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
import BlockedRoute from './components/BlockedRoute';
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const TopMoviesPage = lazy(() => import('./pages/TopMoviesPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const UserReviewsPage = lazy(() => import('./pages/UserReviewsPage'));
const ActorsPage = lazy(() => import('./pages/ActorsPage'));
const ActorDetailPage = lazy(() => import('./pages/ActorDetailPage'));
const MovieCastPage = lazy(() => import('./pages/MovieCastPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CookiePopup = lazy(() => import('./components/CookiePopup'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const Footer = lazy(() => import('./components/Footer'));
const PromoBanner = lazy(() => import('./components/PromoBanner'));
import ProtectedRoute from './components/ProtectedRoute';
const BlacklistPage = lazy(() => import('./pages/BlacklistPage'));
const AppealPage = lazy(() => import('./pages/AppealPage'));
const AdminAppealsPage = lazy(() => import('./pages/AdminAppealsPage'));
const AdminCriticApplicationsPage = lazy(() => import('./pages/AdminCriticApplicationsPage'));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage'));
const MoviePage = lazy(() => import('./pages/MoviePage'));
const CharacterDetailPage = lazy(() => import('./pages/CharacterDetailPage'));
const VoiceActorDetailPage = lazy(() => import('./pages/VoiceActorDetailPage'));
const NewsBanner = lazy(() => import('./components/NewsBanner'));
const NewsDetailsPage = lazy(() => import('./pages/NewsDetailsPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const AdminRolesPage = lazy(() => import('./pages/AdminRolesPage'));
const CriticReviewsPage = lazy(() => import('./pages/CriticReviewsPage'));
const ModeratorPage = lazy(() => import('./pages/ModeratorPage'));
const TierListsPage = lazy(() => import('./pages/TierListsPage'));
const TierListDetailPage = lazy(() => import('./pages/TierListDetailPage'));
const EditTierListPage = lazy(() => import('./pages/EditTierListPage'));
const AdminTierListModerationPage = lazy(() => import('./pages/AdminTierListModerationPage'));
const ForumPage = lazy(() => import('./pages/ForumPage'));
const ForumCategoryPage = lazy(() => import('./pages/ForumCategoryPage'));
const ForumTopicPage = lazy(() => import('./pages/ForumTopicPage'));
const AdminForumModerationPage = lazy(() => import('./pages/AdminForumModerationPage'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const AdminNewsPage = lazy(() => import('./pages/AdminNewsPage'));
const AllNewsPage = lazy(() => import('./pages/AllNewsPage'));
const SupportWidget = lazy(() => import('./components/SupportWidget'));

import React, { useEffect } from 'react';
import { AchievementProvider } from './contexts/AchievementContext';

function App() {
  useEffect(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
  }, []);

  return (
    <SignalRProvider>
      <PresenceProvider>
        <AuthProvider>
          <ThemeProvider>
            <FriendsProvider>
              <AchievementProvider>
                <Router>
                  <div className="App">
                    <Suspense fallback={null}>
                      <PromoBanner />
                    </Suspense>
                    <Suspense fallback={null}>
                      <NewsBanner />
                    </Suspense>
                    <Navigation />
                    <main id="main" role="main">
                      <Suspense fallback={<div style={{minHeight:200}} /> }>
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
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/newsposts/:id" element={<NewsDetailPage />} />
                    <Route path="/newsposts" element={<AllNewsPage />} />
                    <Route path="/admin/news" element={
                      <ProtectedRoute adminOnly>
                        <AdminNewsPage />
                      </ProtectedRoute>
                    } />
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
                    <Route path="/admin/support" element={
                      <ProtectedRoute>
                        <AdminSupportPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                  <Suspense fallback={null}>
                    <SupportWidget />
                  </Suspense>
                  <Suspense fallback={null}>
                    <CookiePopup />
                  </Suspense>
                  <Suspense fallback={null}>
                    <Footer />
                  </Suspense>
                </Router>
              </AchievementProvider>
            </FriendsProvider>
          </ThemeProvider>
        </AuthProvider>
      </PresenceProvider>
    </SignalRProvider>
  );
}

export default App;