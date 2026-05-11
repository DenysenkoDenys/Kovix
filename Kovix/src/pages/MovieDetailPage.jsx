import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Badge, Spinner, Button, Form, Card } from 'react-bootstrap';
import { moviesAPI, reviewsAPI, watchlistAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import AdminMovieModal from '../components/AdminMovieModal';
import AdminEpisodeModal from '../components/AdminEpisodeModal';
import CharactersList from '../components/CharactersList';
import MoviePhotos from '../components/MoviePhotos';
import CriticReviewsSection from '../components/CriticReviewsSection';
import SimilarMovies from '../components/SimilarMovies';
import defaultPosterImg from '../assets/NotFoundPoster.webp';
import defaultAvatarImg from '../assets/NotFoundAvatar.png';
import '../style/App.css';
import { API_BASE_URL } from '../utils/apiConfig';
import AdminMovieAwardModal from '../components/AdminMovieAwardModal';
import { adminMovieAwardsAPI } from '../services/api';
import MovieQuizModal from '../components/MovieQuizModal';

const LIKE_ID = 6;
const DISLIKE_ID = 7;

const EMOTIONS = [
  { id: 1, label: 'Супер', icon: '❤️', key: 'Love' },
  { id: 2, label: 'Смішно', icon: '😂', key: 'Funny' },
  { id: 3, label: 'Вау', icon: '😲', key: 'Wow' },
  { id: 4, label: 'Сумно', icon: '😢', key: 'Sad' },
  { id: 5, label: 'Злить', icon: '😡', key: 'Angry' },
];

const WATCH_STATUSES = [
  { id: 0, label: '+ Додати в список' },
  { id: 1, label: '📅 Заплановано' },
  { id: 2, label: '👀 Переглядаю' },
  { id: 3, label: '✅ Переглянуто' },
  { id: 4, label: '❌ Закинуто' },
];

function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [watchStatus, setWatchStatus] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null)

  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showReactionPopup, setShowReactionPopup] = useState(false);
  const [charactersRefreshKey, setCharactersRefreshKey] = useState(0);
  const popupRef = useRef(null);
  const userReview = user ? reviews.find(r => r.userId === user.id) : null;
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardToEdit, setAwardToEdit] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);

  useEffect(() => {
    loadMovieData();
  }, [id]);

  useEffect(() => {
    moviesAPI.getById(id)
      .then(res => setMovie(res.data))
      .catch(err => console.error(err));
  }, [id]);

  useEffect(() => {
    const viewedMovies = JSON.parse(sessionStorage.getItem('viewedMovies') || '[]');

    if (viewedMovies.includes(id)) {
      return;
    }

    const timer = setTimeout(() => {
      moviesAPI.incrementView(id)
        .then(res => {
          setMovie(prev => prev ? { ...prev, viewsCount: res.data.viewsCount } : prev);

          viewedMovies.push(id);
          sessionStorage.setItem('viewedMovies', JSON.stringify(viewedMovies));
        })
        .catch(err => console.error("Не вдалося зарахувати перегляд", err));
    }, 3000);

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowReactionPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && !user.isBlocked) {
      const timer = setTimeout(() => {
        moviesAPI.addToHistory(id).catch(err => console.error("History error", err));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [id, user]);

  useEffect(() => {
    if (movie && !movie.castImported && (movie.tmdbId || movie.malId)) {
      const autoImportCast = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/movies/${movie.id}/auto-import-cast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const updatedMovie = await moviesAPI.getById(id);
            setMovie(updatedMovie.data);
            setCharactersRefreshKey(prev => prev + 1);
          }
        } catch (error) {
          console.error('⚠️ Помилка при автоімпорті касту:', error);
        }
      };

      autoImportCast();
    }
  }, [id, movie?.castImported]);

  const loadMovieData = async () => {
    try {
      const [movieRes, reviewsRes] = await Promise.all([
        moviesAPI.getById(id),
        reviewsAPI.getByMovie(id)
      ]);
      setMovie(movieRes.data);
      setReviews(reviewsRes.data);

      const savedHistory = JSON.parse(localStorage.getItem('kovix_recent_movies') || '[]');
      const movieData = {
        id: movieRes.data.id,
        title: movieRes.data.title,
        posterUrl: movieRes.data.posterUrl
      };
      
      const filteredHistory = savedHistory.filter(m => m.id !== movieData.id);
      
      const newHistory = [movieData, ...filteredHistory].slice(0, 10);
      localStorage.setItem('kovix_recent_movies', JSON.stringify(newHistory));

      if (user) {
        try {
          const watchlistRes = await watchlistAPI.getStatus(id);
          setWatchStatus(watchlistRes.data.status);
          setIsFavorite(watchlistRes.data.isFavorite);

          if (movieRes.data.isSeries) {
            setCurrentSeason(watchlistRes.data.season || 1);
            setCurrentEpisode(watchlistRes.data.episode || 1);
          }
        } catch (err) {
          console.error("Помилка завантаження списку", err);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewChange = async () => {
    try {
      const reviewsRes = await reviewsAPI.getByMovie(id);
      setReviews(reviewsRes.data);

      const movieRes = await moviesAPI.getById(id);

      setMovie(prev => ({
        ...prev,
        averageRating: movieRes.data.averageRating,
        totalReviews: movieRes.data.totalReviews,
      }));

    } catch (error) {
      console.error("Не вдалося оновити відгуки:", error);
    }
  };

  const handleReaction = async (typeId) => {
    if (!user) return alert("Будь ласка, увійдіть, щоб оцінити фільм!");
    try {
      setShowReactionPopup(false);
      await moviesAPI.react(id, typeId);
      const movieRes = await moviesAPI.getById(id);
      setMovie(movieRes.data);
    } catch (error) {
      console.error("Помилка реакції:", error);
    }
  };

  const handleWatchlistUpdate = async ({
    newStatus = watchStatus,
    newFavorite = isFavorite,
    newSeason = currentSeason,
    newEpisode = currentEpisode
  } = {}) => {
    if (!user) return alert("Будь ласка, увійдіть!");

    setWatchStatus(parseInt(newStatus));
    setIsFavorite(newFavorite);
    setCurrentSeason(parseInt(newSeason));
    setCurrentEpisode(parseInt(newEpisode));

    try {
      await watchlistAPI.update(id, {
        status: parseInt(newStatus),
        isFavorite: newFavorite,
        season: movie.isSeries ? parseInt(newSeason) : undefined,
        episode: movie.isSeries ? parseInt(newEpisode) : undefined
      });
    } catch (error) {
      console.error(error);
      alert("Не вдалося зберегти зміни");
    }
  };

  const handleDeleteMovie = async () => {
    if (window.confirm(`Видалити фільм "${movie.title}"?`)) {
      try {
        await moviesAPI.delete(movie.id);
        navigate('/');
      } catch { alert('Помилка видалення'); }
    }
  };

  const handleEditEpisode = (episode) => {
    setSelectedEpisode(episode);
    setShowEpisodeModal(true);
  };

  const handleAddEpisode = () => {
    setSelectedEpisode(null);
    setShowEpisodeModal(true);
  };

  const handleDeleteEpisode = async (episodeId) => {
    if (window.confirm("Видалити цей епізод?")) {
      try {
        await moviesAPI.deleteEpisode(episodeId);
        loadMovieData();
      } catch (error) {
        console.error(error);
        alert("Не вдалося видалити епізод");
      }
    }
  };

  const handleRateEpisode = async (episodeId, ratingValue) => {
    const rating = parseInt(ratingValue);

    setMovie(prevMovie => ({
      ...prevMovie,
      episodes: prevMovie.episodes.map(ep =>
        ep.id === episodeId
          ? { ...ep, currentUserRating: rating }
          : ep
      )
    }));

    try {
      const response = await moviesAPI.rateEpisode(episodeId, rating);

      const { episodeAverage, seriesAverage } = response.data;

      setMovie(prevMovie => ({
        ...prevMovie,
        averageRating: seriesAverage,
        episodes: prevMovie.episodes.map(ep =>
          ep.id === episodeId
            ? { ...ep, averageRating: episodeAverage, currentUserRating: rating }
            : ep
        )
      }));

    } catch (error) {
      console.error("Помилка оцінки:", error);
      alert("Не вдалося зберегти оцінку");
    }
  };

  const handleDeleteAward = async (awardId) => {
    if (!window.confirm('Видалити цю нагороду?')) return;
    try {
      await adminMovieAwardsAPI.removeAward(awardId);
      loadMovieData();
    } catch (e) {
      alert("Помилка видалення нагороди");
    }
  };

  const handleAddAwardClick = () => {
    setAwardToEdit(null);
    setShowAwardModal(true);
  };

  const handleEditAwardClick = (award) => {
    setAwardToEdit(award);
    setShowAwardModal(true);
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return "success";
    if (rating >= 5) return "warning";
    return "danger";
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  if (!movie) return <Container className="mt-5 text-center"><h2>Фільм не знайдено</h2></Container>;

  const likesCount = movie.reactionCounts['Like'] || 0;
  const dislikesCount = movie.reactionCounts['Dislike'] || 0;

  return (
    <Container className="mt-4">
      {user && isAdmin() && (
        <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-4 shadow-sm"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
          <span className="fw-bold">🛠️ Адмін-панель</span>

          <div className="d-flex gap-2">
            {movie.isSeries && (
              <Button variant="success" size="sm" onClick={handleAddEpisode}>
                + Епізод
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setShowEditModal(true)}>✏️ Редагувати</Button>
            <Button variant="danger" size="sm" onClick={handleDeleteMovie}>🗑️ Видалити</Button>
          </div>
        </div>
      )}

      <Row>
        <Col md={4} className="mb-4">
          <img
            src={
              movie.posterUrl
                ? (movie.posterUrl.startsWith('http')
                  ? movie.posterUrl
                  : `${API_BASE_URL}${movie.posterUrl}`)
                : defaultPosterImg
            }
            alt={movie.title}
            className="img-fluid rounded shadow w-100"
            style={{ objectFit: 'cover' }}
            onError={(e) => { e.target.src = defaultPosterImg; }}
          />
        </Col>

        <Col md={8}>
          <div className="d-flex align-items-center mb-1 gap-2">
            <h1 className="mb-0">{movie.title}</h1>
            {movie.isSeries && <Badge bg="primary">TV Series</Badge>}
          </div>

          <div className="text-muted mb-3 d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.2rem' }}>👁️</span>
            <span className="mt-1">{movie.viewsCount || 0} переглядів сторінки</span>
          </div>

          {movie.director && (
            <div className="text-secondary mb-3" style={{ fontSize: '1.1rem' }}>
              <span className="fw-bold" style={{ color: 'var(--text-main)' }}>Режисер:</span> {movie.director}
            </div>
          )}

          <div className="mb-4">
            <Badge bg={getRatingColor(movie.averageRating)} className="me-2 fs-5 p-2">
              ⭐ {movie.averageRating.toFixed(1)}
            </Badge>

            <Badge bg="secondary" className="me-2 fs-5 p-2">
              {movie.year}
            </Badge>

            {movie.genre?.split(',').map((g) => {
              const genre = g.trim();
              return (
                <Badge
                  key={genre}
                  bg="info"
                  pill
                  className="fs-6 p-2 me-2 genre-badge"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/movies?genres=${encodeURIComponent(genre.toLowerCase())}`)}
                  title={`Показати всі фільми жанру "${genre}"`}
                >
                  #{genre}
                </Badge>
              );
            })}
          </div>

          <p className="lead">{movie.description}</p>
          <hr style={{ borderColor: 'var(--border-color)' }} />

          {movie.trailerUrl && (
            <div className="mb-4">
              <div className="ratio ratio-16x9 shadow-sm rounded overflow-hidden">
                <iframe src={movie.trailerUrl} title="Trailer" allowFullScreen></iframe>
              </div>
              {user && (
                <div className="mt-3 d-flex justify-content-end">
                  <Button
                    variant="outline-info"
                    onClick={() => setShowQuizModal(true)}
                    className="d-flex align-items-center gap-2"
                  >
                    Тест на знання
                  </Button>
                </div>
              )}
            </div>
          )}

          <div
            className="d-flex flex-wrap align-items-center p-3 shadow-sm mb-5 gap-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '25px'
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <Button
                variant={movie.currentUserVote === LIKE_ID ? "success" : "outline-secondary"}
                size="sm"
                onClick={() => handleReaction(LIKE_ID)}
                style={{ borderRadius: '20px', padding: '5px 15px' }}
              >
                👍 {likesCount > 0 && <span className="ms-1">{likesCount}</span>}
              </Button>
              <Button
                variant={movie.currentUserVote === DISLIKE_ID ? "danger" : "outline-secondary"}
                size="sm"
                onClick={() => handleReaction(DISLIKE_ID)}
                style={{ borderRadius: '20px', padding: '5px 15px' }}
              >
                👎 {dislikesCount > 0 && <span className="ms-1">{dislikesCount}</span>}
              </Button>
            </div>

            <div className="vr mx-2" style={{ backgroundColor: 'var(--border-color)', opacity: 1 }}></div>

            <div className="d-flex align-items-center gap-2">
              <Form.Select
                size="sm"
                value={watchStatus}
                onChange={(e) => handleWatchlistUpdate({ newStatus: e.target.value })}
                style={{ maxWidth: '160px', cursor: 'pointer', borderRadius: '20px' }}
                className="shadow-none"
              >
                {WATCH_STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Form.Select>

              <Button
                variant={isFavorite ? "warning" : "outline-secondary"}
                size="sm"
                onClick={() => handleWatchlistUpdate({ newFavorite: !isFavorite })}
                title={isFavorite ? "Видалити з улюблених" : "Додати в улюблене"}
                style={{ color: !isFavorite ? 'var(--text-main)' : '#fff', borderRadius: '20px', padding: '5px 12px' }}
              >
                ★
              </Button>
            </div>

            <div className="vr mx-2 d-none d-md-block" style={{ backgroundColor: 'var(--border-color)', opacity: 1 }}></div>

            <div className="position-relative" ref={popupRef}>
              {(() => {
                const activeEmotion = EMOTIONS.find(e => e.id === movie.currentUserEmotion);
                return (
                  <Button
                    variant="outline-secondary" size="sm" onClick={() => setShowReactionPopup(!showReactionPopup)}
                    style={{
                      color: activeEmotion ? '#e2264d' : 'var(--text-main)',
                      borderColor: activeEmotion ? '#e2264d' : 'var(--border-color)',
                      backgroundColor: activeEmotion ? 'rgba(226, 38, 77, 0.1)' : 'transparent',
                      borderRadius: '20px', padding: '5px 15px'
                    }}
                  >
                    {activeEmotion ? <>{activeEmotion.icon} {activeEmotion.label}</> : <>☺</>}
                  </Button>
                );
              })()}
              {showReactionPopup && (
                <div className="position-absolute bottom-100 start-50 translate-middle-x mb-2 p-2 rounded shadow d-flex gap-2"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', zIndex: 1000, width: 'max-content', borderRadius: '20px' }}
                >
                  {EMOTIONS.map((emo) => (
                    <div key={emo.id} className="d-flex flex-column align-items-center p-2 rounded reaction-hover"
                      onClick={() => handleReaction(emo.id)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                      <span style={{ fontSize: '1.5rem' }}>{emo.icon}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{emo.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="d-flex gap-2 flex-wrap">
              {Object.entries(movie.reactionCounts).map(([key, count]) => {
                if (key === 'Like' || key === 'Dislike' || count === 0) return null;
                const emo = EMOTIONS.find(e => e.key === key);
                if (!emo) return null;
                const isActive = movie.currentUserEmotion === emo.id;
                return (
                  <div key={key} onClick={() => handleReaction(emo.id)}
                    className={`d-flex align-items-center gap-1 px-2 py-1 border ${isActive ? 'border-danger bg-light-danger' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', backgroundColor: isActive ? 'rgba(220, 53, 69, 0.1)' : 'transparent', borderColor: isActive ? '#dc3545' : 'var(--border-color)', borderRadius: '15px' }}
                    title={emo.label}
                  >
                    <span>{emo.icon}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {movie.franchiseName && movie.franchiseMovies && movie.franchiseMovies.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 border-start border-4 border-info ps-2">
                Порядок перегляду: {movie.franchiseName}
              </h3>

              <div className="d-flex flex-column gap-2">
                {movie.franchiseMovies.map((fm) => (
                  <Link
                    key={fm.id}
                    to={`/movie/${fm.id}`}
                    className="text-decoration-none"
                  >
                    <div
                      className={`p-3 rounded d-flex align-items-center ${fm.isCurrent ? 'border-primary border' : 'border'}`}
                      style={{
                        backgroundColor: fm.isCurrent ? 'rgba(13, 110, 253, 0.1)' : 'var(--bg-card)',
                        borderColor: fm.isCurrent ? 'var(--primary-color)' : 'var(--border-color)',
                        color: 'var(--text-main)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!fm.isCurrent) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                      }}
                      onMouseLeave={(e) => {
                        if (!fm.isCurrent) e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                      }}
                    >
                      <Badge bg={fm.isCurrent ? "primary" : "secondary"} className="me-3 fs-6">
                        Частина {fm.order}
                      </Badge>
                      <span className={fm.isCurrent ? "fw-bold text-primary" : "fw-semibold"}>
                        {fm.title}
                      </span>
                      {fm.isCurrent && (
                        <span className="ms-auto fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                          👈 Ви зараз тут
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {movie.isSeries && movie.episodes && movie.episodes.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 border-start border-4 border-primary ps-2">Список епізодів</h3>

              <div className="d-flex flex-column gap-2">
                {movie.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3 rounded"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Row className="align-items-center g-2">

                      <Col xs={5} md={5} className="d-flex align-items-center gap-2 overflow-hidden">
                        <div className="text-secondary fw-bold flex-shrink-0" style={{ minWidth: '60px' }}>
                          S{ep.seasonNumber} E{ep.episodeNumber}
                        </div>
                        <div className="fw-semibold text-truncate" title={ep.title}>
                          {ep.title || `Епізод ${ep.episodeNumber}`}
                        </div>
                      </Col>

                      <Col xs={3} md={4} className="d-flex justify-content-center">
                        <div className="d-flex align-items-center gap-2 w-100 justify-content-center">
                          <small className="text-secondary d-none d-lg-inline text-nowrap" style={{ fontSize: '0.75rem' }}>Ваша:</small>
                          <Form.Select
                            size="sm"
                            value={ep.currentUserRating || ""}
                            onChange={(e) => handleRateEpisode(ep.id, e.target.value)}
                            style={{
                              width: '100%',
                              minWidth: '60px',
                              maxWidth: '400px',
                              cursor: 'pointer',
                              backgroundColor: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              borderColor: 'var(--border-color)',
                              fontSize: '0.9rem',
                              textAlign: 'center',
                              padding: '0.2rem 0.5rem'
                            }}
                          >
                            <option value="" disabled>-</option>
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </Form.Select>
                        </div>
                      </Col>

                      <Col xs={4} md={3} className="d-flex justify-content-end">
                        <div className="d-flex align-items-center gap-2 flex-nowrap">

                          <div className="d-flex align-items-center gap-1 text-warning text-nowrap">
                            <span>★</span>
                            <span className="fw-bold fs-6">{ep.averageRating > 0 ? ep.averageRating.toFixed(1) : '-'}</span>
                          </div>

                          {user && isAdmin() && (
                            <div className="d-flex gap-1 ms-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '24px', height: '24px' }}
                                onClick={() => handleEditEpisode(ep)}
                                title="Редагувати"
                              >
                                <span style={{ fontSize: '0.7rem' }}>✏️</span>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '24px', height: '24px' }}
                                onClick={() => handleDeleteEpisode(ep.id)}
                                title="Видалити"
                              >
                                <span style={{ fontSize: '0.7rem' }}>🗑️</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </Col>

                    </Row>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(movie.awards?.length > 0 || user?.role === 'Admin') && (
            <div className="mb-5">
              {movie.awards?.length > 0 && (
                <>
                  <h3 className="border-start border-4 border-warning ps-2 mb-3">
                    Нагороди
                  </h3>
                  <div className="mb-4 d-flex flex-wrap align-items-center gap-2">
                    {movie.awards.map(award => (
                      <div
                        key={award.id}
                        className="d-flex align-items-center px-3 py-1 rounded-pill"
                        style={{
                          background: 'linear-gradient(45deg, #FFD700 0%, #FDB931 100%)',
                          color: '#4A3B00',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 10px rgba(255, 215, 0, 0.3)'
                        }}
                        title={award.name}
                      >
                        <span className="me-2 fs-5">{award.icon}</span>
                        <span>{award.name}</span>

                        {user?.role === 'Admin' && (
                          <div className="d-flex align-items-center gap-2 ms-3 ps-2" style={{ borderLeft: '1px solid rgba(0,0,0,0.3)' }}>
                            <span
                              onClick={() => handleEditAwardClick(award)}
                              title="Редагувати нагороду"
                              style={{ cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7, transition: 'opacity 0.2s' }}
                              onMouseEnter={(e) => e.target.style.opacity = '1'}
                              onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                            >
                              ✏️
                            </span>
                            <span
                              onClick={() => handleDeleteAward(award.id)}
                              title="Видалити нагороду"
                              style={{ cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7, transition: 'opacity 0.2s' }}
                              onMouseEnter={(e) => e.target.style.opacity = '1'}
                              onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                            >
                              ❌
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {user?.role === 'Admin' && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
                        onClick={handleAddAwardClick}
                      >
                        <i className="bi bi-plus-lg"></i> Додати
                      </Button>
                    )}
                  </div>
                </>
              )}

              {movie.awards?.length === 0 && user?.role === 'Admin' && (
                <div className="mb-4">
                  <h3 className="border-start border-4 border-warning ps-2 mb-3">
                    Нагороди
                  </h3>
                  <p className="text-muted mb-3">Нагород ще не додано</p>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    className="rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
                    onClick={() => setShowAwardModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i> Додати нагороду
                  </Button>
                </div>
              )}
            </div>
          )}

          {movie?.cast?.length > 0 && (
            <div className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="border-start border-4 border-primary ps-2 mb-0">
                  Акторський склад
                </h3>
                {movie.cast.length > 6 && (
                  <Link to={`/movie/${movie.id}/cast`} className="btn btn-sm btn-outline-primary rounded-pill">
                    Дивитися всіх ({movie.cast.length})
                  </Link>
                )}
              </div>

              <div
                className="d-flex overflow-auto pb-3 gap-3"
                style={{ scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}
              >
                {movie.cast.slice(0, 6).map((actor, index) => {
                  const actorCard = (
                    <Card className="h-100 border-0 shadow-sm bg-card movie-card-hover">
                      <div style={{ height: '150px', overflow: 'hidden' }} className="rounded-top">
                        <Card.Img
                          variant="top"
                          src={
                            actor?.photoUrl
                              ? (actor.photoUrl.startsWith('http')
                                ? actor.photoUrl
                                : `${API_BASE_URL}${actor.photoUrl}`)
                              : defaultAvatarImg
                          }
                          className="w-100 h-100 object-fit-cover"
                          onError={(e) => (e.target.src = defaultAvatarImg)}
                        />
                      </div>
                      <Card.Body className="p-2 text-center">
                        <div className="fw-bold text-truncate text-main" style={{ fontSize: '0.9rem' }} title={actor?.name}>
                          {actor?.name}
                        </div>
                        <div className="text-muted small text-truncate" title={actor?.role}>
                          {actor?.role}
                        </div>
                      </Card.Body>
                    </Card>
                  );

                  return actor?.actorId > 0 ? (
                    <Link
                      key={actor.actorId}
                      to={`/actors/${actor.actorId}`}
                      className="text-decoration-none"
                      style={{ minWidth: '120px', maxWidth: '120px' }}
                    >
                      {actorCard}
                    </Link>
                  ) : (
                    <div
                      key={`${actor?.name}-${index}`}
                      style={{ minWidth: '120px', maxWidth: '120px' }}
                    >
                      {actorCard}
                    </div>
                  );
                })}

                {movie.cast.length > 6 && (
                  <Link
                    to={`/movie/${movie.id}/cast`}
                    className="text-decoration-none"
                    style={{ minWidth: '120px', maxWidth: '120px' }}
                  >
                    <Card className="h-100 border-0 shadow-sm bg-card movie-card-hover d-flex align-items-center justify-content-center text-center p-2">
                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mb-2" style={{ width: '50px', height: '50px' }}>
                        <span className="fs-4">➜</span>
                      </div>
                      <div className="fw-bold text-main" style={{ fontSize: '0.9rem' }}>
                        Всі актори
                      </div>
                      <div className="text-muted small">
                        +{movie.cast.length - 6} більше
                      </div>
                    </Card>
                  </Link>
                )}
              </div>
            </div>
          )}
        </Col>
      </Row>

      {movie?.id && (() => {
        const isAnime = movie.malId !== null && movie.malId !== undefined;
        return isAnime ? <CharactersList movieId={movie.id} refreshKey={charactersRefreshKey} /> : null;
      })()}

      {movie?.id && <MoviePhotos movieId={movie.id} movieTitle={movie.title} />}

      <CriticReviewsSection 
        movieId={id} 
        maxItems={2}
        onShowAllClick={() => navigate(`/movie/${id}/critic-reviews`)}
      />

      <Row className="mt-3">
        <Col>
          <h3 className="mb-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>Відгуки глядачів</h3>
          {userReview ? (
            <div className="alert alert-info mb-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              Ви вже залишили відгук до цього фільму/серіалу. Дякуємо!
            </div>
          ) : (
            <ReviewForm movieId={movie.id} onSubmit={handleReviewChange} />
          )}
          <ReviewList reviews={reviews} onReviewUpdated={handleReviewChange} />
        </Col>
      </Row>

      <AdminEpisodeModal
        show={showEpisodeModal}
        onHide={() => setShowEpisodeModal(false)}
        movieId={movie.id}
        episodeToEdit={selectedEpisode}
        onSuccess={loadMovieData}
      />

      <AdminMovieModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        movieToEdit={movie}
        onSuccess={() => {
          loadMovieData();
          setCharactersRefreshKey(prev => prev + 1);
        }}
      />

      <AdminMovieAwardModal
        show={showAwardModal}
        onHide={() => setShowAwardModal(false)}
        movieId={movie.id}
        onAwardAdded={loadMovieData}
        awardToEdit={awardToEdit}
      />

      <MovieQuizModal
        show={showQuizModal}
        onHide={() => setShowQuizModal(false)}
        movieId={movie.id}
        movieTitle={movie.title}
      />

      <SimilarMovies movieId={movie.id} />
    </Container>
  );
}

export default MovieDetailPage;