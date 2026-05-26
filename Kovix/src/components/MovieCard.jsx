import { Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import defaultPosterImg from '../assets/NotFoundPoster.webp'; 
import LazyImage from './LazyImage';
import '../style/MovieCard.css';
import { API_BASE_URL } from '../utils/apiConfig';

const NEW_MOVIE_DAYS = 45;

function MovieCard({ movie, disableLink = false, hideMeta = false, isNew = false }) {
  const getRatingColor = (rating) => {
    if (rating >= 8) return "success";
    if (rating >= 5) return "warning";
    return "danger";
  };

  const parseCreatedAt = () => {
    if (!movie) return null;
    if (movie.createdAt) return new Date(movie.createdAt);
    if (movie.CreatedAt) return new Date(movie.CreatedAt);
    return null;
  };

  const isNewByDate = () => {
    const createdAt = parseCreatedAt();
    if (!createdAt) return false;
    const diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
    return diffDays <= NEW_MOVIE_DAYS;
  };

  const showNewBadge = isNew || isNewByDate();

  const ratingValue = movie.averageRating || movie.rating || 0;
  const genresValue = movie.genre || movie.genres || '';

  let imageUrl = defaultPosterImg;
  if (movie.posterUrl) {
      if (movie.posterUrl.startsWith('http')) {
          imageUrl = movie.posterUrl; 
      } else {
          imageUrl = `${API_BASE_URL}${movie.posterUrl}`; 
      }
  }

  const CardContent = (
    <Card className="h-100 shadow-sm movie-card">
      <div className="movie-card-img-wrapper position-relative"> 
        
        {showNewBadge && (
          <div className="new-badge">
            <span className="new-badge-dot" />
            Новинка
          </div>
        )}

        {movie.isSeries && (
            <Badge 
                bg="primary" 
                className="position-absolute top-0 start-0 m-2 shadow-sm" 
                style={{ zIndex: 2 }}
            >
                📺 Серіал
            </Badge>
        )}

        <LazyImage
          src={imageUrl}
          alt={movie.title}
          placeholder={defaultPosterImg}
          className="movie-card-img"
          width={300}
          height={450}
        />
      </div>

      <Card.Body className="d-flex flex-column p-3">
        <Card.Title className="movie-title text-truncate" title={movie.title}>
          {movie.title}
        </Card.Title>

        {!hideMeta && (
          <div className="d-flex align-items-center gap-2 mb-2">
            <Badge
              bg={getRatingColor(ratingValue)}
              className="movie-rating-badge"
            >
              ⭐ {ratingValue.toFixed(1)}
            </Badge>
            {(movie.viewsCount || movie.ViewsCount) && (
              <Badge className="movie-meta-badge">
                👁️ {movie.viewsCount || movie.ViewsCount}
              </Badge>
            )}
            {(movie.totalReviews || movie.TotalReviews) && (
              <Badge bg="secondary" className="movie-meta-badge">
                💬 {movie.totalReviews || movie.TotalReviews}
              </Badge>
            )}
          </div>
        )}

        {!hideMeta && (
          <Card.Text className="movie-meta text-muted small" title={`${movie.year} • ${genresValue}`}>
            {movie.year} • {genresValue}
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  );

  if (disableLink) {
    return (
      <div className="movie-card-static h-100">
        {CardContent}
      </div>
    );
  }

  return (
    <Link to={`/movie/${movie.id}`} className="movie-card-link text-decoration-none">
      {CardContent}
    </Link>
  );
}

export default MovieCard;