import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const moviesAPI = {
  getAll: (page = 1, pageSize = 8, search = '', genres = '', year = '', sort = '', awards = '') =>
    api.get('/movies', { params: { page, pageSize, search, genres, year, sort, awards } }),
  getFilters: () => api.get('/movies/filters'),
  getNew: (days = 45, limit = 10) =>
    api.get(`/movies/new?days=${days}&limit=${limit}`),
  getById: (id) => api.get(`/movies/${id}`),
  getTrending: () => api.get('/movies/trending'),
  getTopRated: () => api.get('/movies/top-rated'),
  getRandom: () => api.get('/movies/random'),
  addToHistory: (id) => api.post(`/movies/${id}/history`),
  getHistory: () => api.get('/movies/history'),
  create: (movieData) => api.post('/movies', movieData),
  update: (id, movieData) => api.put(`/movies/${id}`, movieData),
  delete: (id) => api.delete(`/movies/${id}`),
  react: (movieId, type) => api.post(`/movies/${movieId}/react?type=${type}`),

  rateEpisode: (episodeId, rating) => {
    return api.post(`/movies/rate-episode/${episodeId}?rating=${rating}`);
  },

  addEpisode: (movieId, data) => {
    return api.post(`/movies/${movieId}/add-episode`, data);
  },

  updateEpisode: (id, data) => {
    return api.put(`/movies/episodes/${id}`, data);
  },

  deleteEpisode: (id) => {
    return api.delete(`/movies/episodes/${id}`);
  },

  searchTmdb: (query) => api.get(`/movies/tmdb/search?query=${encodeURIComponent(query)}`),
  getTmdbDetails: (tmdbId) => api.get(`/movies/tmdb/details/${tmdbId}`),
  getLatest: () => api.get('/movies/latest'),
  incrementView: (id) => api.post(`/movies/${id}/increment-view`),
  getFranchises: () => api.get('/movies/franchises'),
  getLatestReleases: () => api.get('/movies/latest-releases'),
  getSimilar: (id) => api.get(`/movies/${id}/similar`),
  getRecommended: () => api.get('/movies/recommended')
};

export const reviewsAPI = {
  getByMovie: (movieId) => api.get(`/reviews/movie/${movieId}`),
  create: (reviewData) => api.post('/reviews', reviewData),
  update: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  delete: (id) => api.delete(`/reviews/${id}`),
  vote: (reviewId, isLike) => api.post(`/reviews/${reviewId}/vote?isLike=${isLike}`),
  getByUser: (userId) => api.get(`/reviews/user/${userId}`),
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (formData) => api.put('/auth/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateSettings: (data) => api.put('/auth/settings', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateTitle: (awardId) => api.put('/auth/me/title', { awardId }),
  sendVerificationCode: () => api.post('/auth/send-verification-code'),
  verifyEmail: (code) => api.post('/auth/verify-email', { code })
};

export const watchlistAPI = {
  getStatus: (movieId) => api.get(`/watchlist/movie/${movieId}`),
  update: (movieId, data) => api.post(`/watchlist/movie/${movieId}`, data),
  getMyList: () => api.get('/watchlist/my-list'),
};

export const usersAPI = {
  getPublicProfile: (id) => api.get(`/users/${id}/profile`),
  toggleBlock: (id) => api.post(`/users/${id}/toggle-block`),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.delete(`/users/${id}/unfollow`),
  getFollowers: (id) => api.get(`/users/${id}/followers`),
  getFollowing: (id) => api.get(`/users/${id}/following`),
  block: (id) => api.put(`/users/${id}/block`),
  getLeaderboard: (type = 'reviews', limit = 50) => api.get(`/users/leaderboard?type=${type}&limit=${limit}`)
};

export const friendsAPI = {
  add: (userId) => api.post(`/friends/add/${userId}`),
  accept: (userId) => api.post(`/friends/accept/${userId}`),
  remove: (userId) => api.delete(`/friends/remove/${userId}`),
  getMyFriends: () => api.get('/friends/my-friends'),
  checkStatus: (userId) => api.get(`/friends/status/${userId}`),
  getRequests: () => api.get('/friends/requests'),
};

export const blocksAPI = {
  block: (userId) => api.post(`/blocks/${userId}`),
  unblock: (userId) => api.delete(`/blocks/${userId}`),
  check: (userId) => api.get(`/blocks/check/${userId}`),
};

export const chatAPI = {
  getGeneralHistory: () => api.get('/chat/general'),
  getPrivateHistory: (userId) => api.get(`/chat/private/${userId}`),
  markAsRead: (senderId) => api.post(`/chat/messages/read/${senderId}`),
  getGeneralChatInfo: () => api.get('/chat/general'),
  markGeneralAsRead: () => api.post('/chat/general/read'),
  addReaction: (messageId, emoji) => api.post(`/chat/messages/${messageId}/reactions`, { reactionEmoji: emoji }),
  getReactions: (messageId) => api.get(`/chat/messages/${messageId}/reactions`),
  pinMessage: (messageId, pinForEveryone = true, pinForSelf = false) => api.post(`/chat/messages/${messageId}/pin`, { pinForEveryone, pinForSelf }),
  getGeneralPins: () => api.get('/chat/pins/general'),
  getPrivatePins: (userId) => api.get(`/chat/pins/private/${userId}`),
  replyToMessage: (messageId, replyMessageId) => api.post(`/chat/messages/${messageId}/reply`, { replyMessageId }),
  getReplies: (messageId) => api.get(`/chat/messages/${messageId}/replies`)
};

export const reportsAPI = {
  getAll: () => api.get('/reports'),
  create: (data) => api.post('/reports', data),
  resolve: (id, data) => api.put(`/reports/${id}/resolve`, JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json'
    }
  }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clear: () => api.delete('/notifications/clear'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

export const actorsAPI = {
  getAll: () => api.get('/actors'),
  getById: (id) => api.get(`/actors/${id}`),
  create: (data) => api.post('/actors', data),
  update: (id, data) => api.put(`/actors/${id}`, data),
  delete: (id) => api.delete(`/actors/${id}`),
};

export const contentFilterAPI = {
  getBlockedActors: () => api.get('/contentfilter/blocked-actors'),
  blockActor: (actorId) => api.post(`/contentfilter/block-actor/${actorId}`),
  unblockActor: (actorId) => api.delete(`/contentfilter/unblock-actor/${actorId}`)
};

export const appealsAPI = {
  create: (content) => api.post('/appeals', JSON.stringify(content), {
    headers: { 'Content-Type': 'application/json' }
  }),
  getMyAppeal: () => api.get('/appeals/my-appeal'),
  getAll: () => api.get('/appeals'),
  process: (id, data) => api.put(`/appeals/${id}/process`, data),
};

export const charactersAPI = {
  getByMovie: (movieId) => api.get(`/movies/${movieId}/characters`),
  getById: (id) => api.get(`/characters/${id}`),
  create: (movieId, data) => api.post(`/movies/${movieId}/characters`, data),
  update: (movieId, characterId, data) => api.put(`/movies/${movieId}/characters/${characterId}`, data),
  delete: (movieId, characterId) => api.delete(`/movies/${movieId}/characters/${characterId}`),
};

export const voiceActorsAPI = {
  getByCharacter: (characterId) => api.get(`/characters/${characterId}/voice-actors`),
  getByMovie: (movieId) => api.get(`/movies/${movieId}/voice-actors`),
  getById: (actorId) => api.get(`/actors/${actorId}`),
};

export const statsAPI = {
  getStats: () => api.get('/users/stats'),
};

export const moviePhotosAPI = {
  getByMovie: (movieId) => api.get(`/movies/${movieId}/photos`),

  addUrl: (movieId, imageUrl) => api.post(`/movies/${movieId}/photos/url`, `"${imageUrl}"`, {
    headers: { 'Content-Type': 'application/json' }
  }),
  uploadMultiple: (movieId, formData) => api.post(`/movies/${movieId}/photos/upload`, formData),
  delete: (movieId, photoId) => api.delete(`/movies/${movieId}/photos/${photoId}`)
};

export const newsAPI = {
  getAll: () => api.get('/news'),
  getById: (id) => api.get(`/news/${id}`),
  update: (id, data) => api.put(`/news/${id}`, data),
  create: (data) => api.post('/news', data),
  delete: (id) => api.delete(`/news/${id}`)
};

export const newsPostsAPI = {
  getAll: (page = 1, pageSize = 9, search = '', publishedOnly = false) => 
      api.get('/newsposts', { params: { page, pageSize, search, publishedOnly } }),
      
  getById: (id) => api.get(`/newsposts/${id}`),
  update: (id, data) => api.put(`/newsposts/${id}`, data),
  create: (data) => api.post('/newsposts', data),
  delete: (id) => api.delete(`/newsposts/${id}`),
  getLatest: (limit = 3) => api.get(`/newsposts/latest?limit=${limit}`),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/newsposts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const criticReviewsAPI = {
  getByMovie: (movieId) => api.get(`/criticreviews/movie/${movieId}`),
  create: (data) => api.post('/criticreviews', data),
  delete: (id) => api.delete(`/criticreviews/${id}`),
  update: (id, data) => api.put(`/criticreviews/${id}`, data)
};

export const applicationsAPI = {
  submit: (data) => api.post('/reviewerapplications', data),
  getPending: () => api.get('/reviewerapplications/pending'),
  approve: (id) => api.post(`/reviewerapplications/${id}/approve`),
  reject: (id) => api.post(`/reviewerapplications/${id}/reject`)
};

export const adminUsersAPI = {
  getAll: () => api.get(`/adminUsers`),
  changeRole: (id, newRole) => api.put(`/adminUsers/${id}/role`, { newRole: newRole }),
  adjustAppeals: (userId, amount, reason = '') => api.post(`/users/${userId}/appeals/adjust`, { amount, reason }),
  delete: (id) => api.delete(`/criticreviews/${id}`)
};

export const moderatorAPI = {
  getReports: (status = null) => api.get('/moderator/reports', { params: { status } }),
  getUsersForModeration: (blockedOnly = false) => api.get('/moderator/users', { params: { blockedOnly } }),
  deleteCriticReview: (id) => api.delete(`/moderator/reviews/${id}`),
  deleteUserReview: (id) => api.delete(`/moderator/user-reviews/${id}`),
  blockUser: (id, reason = '') => api.put(`/moderator/users/${id}/block`, { Reason: reason }),
  unblockUser: (id) => api.put(`/moderator/users/${id}/unblock`),
  resolveReport: (id, status, comment) => api.put(`/moderator/reports/${id}/resolve`, { Status: status, AdminComment: comment })
};

export const adminMovieAwardsAPI = {
  issueAward: (data) => api.post('/adminMovieAwards', data),
  editAward: (id, data) => api.put(`/adminMovieAwards/${id}`, data),
  removeAward: (id) => api.delete(`/adminMovieAwards/${id}`)
};

export const adminUserAwardsAPI = {
  issueAward: (data) => api.post('/adminUserAwards', data),
  editAward: (id, data) => api.put(`/adminUserAwards/${id}`, data),
  removeAward: (id) => api.delete(`/adminUserAwards/${id}`)
};

export const tierListsAPI = {
  getAll: (userId = null, isPublic = null, page = 1, pageSize = 10) =>
    api.get('/tierlists', { params: { userId, isPublic, page, pageSize } }),
  getById: (id) => api.get(`/tierlists/${id}`),
  getUserTierLists: (userId) => api.get(`/tierlists/user/${userId}`),
  create: (data) => api.post('/tierlists', data),
  update: (id, data) => api.put(`/tierlists/${id}`, data),
  delete: (id) => api.delete(`/tierlists/${id}`),
  share: (id) => api.post(`/tierlists/${id}/share`),
  unshare: (id) => api.post(`/tierlists/${id}/unshare`),
  getPendingForModeration: (page = 1, pageSize = 10) =>
    api.get('/admin/tierlists/pending', { params: { page, pageSize } }),
  getAllForModeration: (status = null, page = 1, pageSize = 10) =>
    api.get('/admin/tierlists', { params: { status, page, pageSize } }),
  moderate: (id, data) => api.post(`/admin/tierlists/${id}/moderate`, data),
  adminDelete: (id) => api.delete(`/admin/tierlists/${id}`),
  getReactions: (id) => api.get(`/tierlists/${id}/reactions`),
  toggleReaction: (id, reactionType) => api.post(`/tierlists/${id}/react`, { reactionType })
};

export const forumAPI = {
  getCategories: () => api.get('/forum/categories'),
  getTopics: (categoryId) => api.get(`/forum/categories/${categoryId}/topics`),
  getTopic: (topicId) => api.get(`/forum/topics/${topicId}`),
  createTopic: (data) => api.post('/forum/topics', data),
  createPost: (topicId, data) => api.post(`/forum/topics/${topicId}/posts`, data),
  createCategory: (data) => api.post('/forum/categories', data),
  getPendingCategories: () => api.get('/forum/admin/pending-categories'),
  moderateCategory: (id, approve) => api.post(`/forum/admin/categories/${id}/moderate?approve=${approve}`),
  deleteCategory: (id) => api.delete(`/forum/categories/${id}`),
  deleteTopic: (id) => api.delete(`/forum/topics/${id}`),
  deletePost: (id) => api.delete(`/forum/posts/${id}`),
  updateCategory: (id, data) => api.put(`/forum/categories/${id}`, data),
  updateTopic: (id, data) => api.put(`/forum/topics/${id}`, data),
  updatePost: (id, data) => api.put(`/forum/posts/${id}`, data),
};

export const subscriptionAPI = {
  createCheckout: (data) => api.post('/subscription/create-checkout', data),
  confirmPayment: (data) => api.post('/subscription/confirm-payment', data)
};

export const supportAPI = {
  createTicket: (data) => api.post('/support/tickets', data),
  getAllTickets: () => api.get('/support/tickets'),
  toggleTicketStatus: (id) => api.put(`/support/tickets/${id}/resolve`),
  getMyTickets: (search = '', page = 1, pageSize = 5) =>
    api.get(`/support/tickets/my?search=${search}&page=${page}&pageSize=${pageSize}`),
  replyToTicket: (id, reply) => api.put(`/support/tickets/${id}/reply`, { reply })
};
export default api;