import { useState, useEffect, lazy, Suspense } from 'react';
import { Container, Button, Spinner, Alert, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MovieCard from '../components/MovieCard';
const RecentlyViewed = lazy(() => import('../components/RecentlyViewed'));
const PopularActors = lazy(() => import('../components/PopularActors'));
const HeroBanner = lazy(() => import('../components/HeroBanner'));
const RecommendedSection = lazy(() => import('../components/RecommendedSection'));
const ComingSoonBlog = lazy(() => import('../components/ComingSoonBlog'));
const SlickSlider = lazy(() => import('react-slick'));
import '../style/HomePage.css';
import { FiX } from 'react-icons/fi';
import { getApiBaseUrl } from '../utils/apiConfig';
import defaultPosterImg from '../assets/NotFoundPoster.webp';

const Slider = SlickSlider;

function HomePage() {
  const { user } = useAuth();
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState(null);
  const [newMovies, setNewMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    import('slick-carousel/slick/slick.css').catch(() => {});
    import('slick-carousel/slick/slick-theme.css').catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [newRes, topRes, trendingRes] = await Promise.all([
        moviesAPI.getNew(45, 12),
        moviesAPI.getTopRated(),
        moviesAPI.getTrending()
      ]);

      setNewMovies(newRes.data);
      setTopRatedMovies(topRes.data);
      setTrendingMovies(trendingRes.data);
    } catch (error) {
      console.error(error);
      setError('Не вдалося завантажити дані.');
    } finally {
      setLoading(false);
    }
  };

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } }
    ]
  };

  const trailerSliderSettings = {
    ...sliderSettings,
    slidesToShow: 2,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 768, settings: { slidesToShow: 1 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } }
    ]
  };


  const getYouTubeId = (url) => {
    if (!url) return null;

    try {
      const u = new URL(url);

      if (u.hostname.includes('youtu.be')) {
        return u.pathname.replace('/', '') || null;
      }

      if (u.searchParams.get('v')) {
        return u.searchParams.get('v');
      }

      const parts = u.pathname.split('/');
      const embedIndex = parts.indexOf('embed');
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }

      return null;
    } catch {
      return null;
    }
  };

  const getYouTubeEmbedUrl = (trailerUrl) => {
    const id = getYouTubeId(trailerUrl);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
  };

  const getYouTubeThumbnail = (trailerUrl) => {
    const id = getYouTubeId(trailerUrl);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const isMovieNew = (movie) => {
    if (!movie) return false;
    const createdAt = movie.createdAt ? new Date(movie.createdAt) : movie.CreatedAt ? new Date(movie.CreatedAt) : null;
    if (!createdAt) return false;
    const diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
    return diffDays <= 45;
  };

  const openTrailer = (movie) => {
    if (!movie.trailerUrl) return;
    setActiveTrailer(movie.trailerUrl);
    setShowTrailer(true);
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setActiveTrailer(null);
  };


  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container className="mt-4 pb-5">

      {user && user.isBlocked && (
        <Alert variant="danger" className="text-center shadow mb-4">
          <h4 className="alert-heading">⛔ Увага! Ваш акаунт заблоковано адміністратором.</h4>
          <p className="mb-0">Вам обмежено доступ до соціальних функцій (чат, коментарі, друзі).</p>
        </Alert>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <HeroBanner />

      <section className="mb-5 slider-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-3 border-start border-4 border-warning ps-2">🔥 Новинки</h3>
          <Link to="/movies" className="text-decoration-none small">Дивитися всі &rarr;</Link>
        </div>
        {newMovies.length > 0 ? (
          <Slider {...sliderSettings}>
            {newMovies.map((movie) => (
              <div key={movie.id} className="p-2">
                <MovieCard movie={movie} isNew={true} />
              </div>
            ))}
          </Slider>
        ) : (
          <p className="text-muted">Немає нових фільмів</p>
        )}
      </section>

      <section className="mb-5 slider-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-3 border-start border-4 border-success ps-2">⭐ Найкращі за рейтингом</h3>
          <Link to="/movies" className="text-decoration-none small">Дивитися всі &rarr;</Link>
        </div>

        {topRatedMovies.length > 0 ? (
          <Slider {...sliderSettings}>
            {topRatedMovies.map((movie) => (
              <div key={movie.id} className="p-2">
                <MovieCard movie={movie} isNew={isMovieNew(movie)} />
              </div>
            ))}
          </Slider>
        ) : (
          <p className="text-muted">Немає рейтингів</p>
        )}
      </section>

      <section className="mb-5 slider-section">
        <div className="d-flex justify-content-between align-items-center mb-3 border-start border-4 border-danger ps-2">
          <h3 className="mb-0">🎬 Найкращі трейлери</h3>
          <Link to="/movies" className="text-decoration-none small">Дивитися всі &rarr;</Link>
        </div>

        {trendingMovies.length > 0 ? (
          <Slider {...trailerSliderSettings}>
            {trendingMovies.map((movie) => {
              const embedUrl = getYouTubeEmbedUrl(movie.trailerUrl);
              const API_BASE_URL = getApiBaseUrl();
              const thumbnailUrl = getYouTubeThumbnail(movie.trailerUrl) || (
                movie.posterUrl?.startsWith('http') ? movie.posterUrl : `${API_BASE_URL}${movie.posterUrl}`
              );

              return (
                <div key={movie.id} className="p-2">
                  <div
                    className="trailer-card position-relative overflow-hidden rounded-4 shadow"
                    onClick={() => openTrailer(movie)}
                    style={{ cursor: 'pointer', aspectRatio: '16/9', backgroundColor: '#000' }}
                  >
                    {embedUrl ? (
                      <>
                        <img
                          src={thumbnailUrl}
                          alt={`Trailer ${movie.title}`}
                          className="w-100 h-100 object-fit-cover trailer-image"
                          onError={(e) => { e.target.src = defaultPosterImg; }}
                        />

                        <div
                          className="position-absolute bottom-0 start-0 w-100"
                          style={{
                            height: '60%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)'
                          }}
                        ></div>

                        <div className="position-absolute top-50 start-50 translate-middle">
                          <div className="play-btn d-flex align-items-center justify-content-center rounded-circle">
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill="white"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ marginLeft: '2px' }}
                            >
                              <path d="M8 5V19L19 12L8 5Z" />
                            </svg>
                          </div>
                        </div>

                        <div className="position-absolute bottom-0 w-100 p-3 text-center">
                          <h6 className="mb-0 fw-bold text-white text-truncate" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)', letterSpacing: '0.5px' }}>
                            {movie.title}
                          </h6>
                        </div>
                      </>
                    ) : (
                      <MovieCard movie={movie} disableLink={true} hideMeta={true} />
                    )}
                  </div>
                </div>
              );
            })}
          </Slider>
        ) : (
          <p className="text-muted">Трейлери відсутні</p>
        )}
      </section>

      <div
        className="text-center mt-5 p-5 rounded shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)'
        }}
      >
        <h2>🎥 Шукаєте щось конкретне?</h2>
        <p className="lead" style={{ color: 'var(--text-secondary)' }}>Перегляньте повний каталог фільмів з пошуком.</p>
        <Link to="/movies">
          <Button variant="primary" size="lg">Відкрити каталог фільмів</Button>
        </Link>
      </div>

      <Suspense fallback={<div /> }>
        <RecentlyViewed />
      </Suspense>

      <Suspense fallback={<div /> }>
        <PopularActors />
      </Suspense>

      <Suspense fallback={<div /> }>
        <RecommendedSection />
      </Suspense>

      <Suspense fallback={<div /> }>
        <ComingSoonBlog />
      </Suspense>

      <Modal
        show={showTrailer}
        onHide={closeTrailer}
        size="lg"
        centered
        contentClassName="bg-black border-0"
      >
        <Modal.Body className="p-0 position-relative">
          <button
            onClick={closeTrailer}
            className="trailer-close-btn"
            aria-label="Закрити трейлер"
          >
            <FiX aria-hidden="true" size={20} />
          </button>

          {activeTrailer && (
            <div className="ratio ratio-16x9">
              <iframe
                src={getYouTubeEmbedUrl(activeTrailer) || activeTrailer}
                title="Movie Trailer"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default HomePage;