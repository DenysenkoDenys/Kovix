import { useState, useEffect } from 'react';
import { Container, Row, Col, Pagination, Spinner, Form, InputGroup, Button, Alert, Badge, Card } from 'react-bootstrap';
import { moviesAPI } from '../services/api';
import { useSearchParams, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import LazyImage from '../components/LazyImage';
import defaultPosterImg from '../assets/NotFoundPoster.webp';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/apiConfig'; 
const PLACEHOLDER_IMG = defaultPosterImg;

const SORT_OPTIONS = [
  { value: 'dateDesc', label: 'Даті додавання (нові)' },
  { value: 'dateAsc', label: 'Даті додавання (старі)' },
  { value: 'ratingDesc', label: 'Рейтингу' },
  { value: 'viewsDesc', label: 'Популярності (Перегляди)' },
  { value: 'yearDesc', label: 'Року випуску' },
  { value: 'titleAsc', label: 'Назві (А-Я)' },
];

const getRatingVariant = (rating) => {
    if (!rating) return 'secondary';
    if (rating >= 8) return 'success'; 
    if (rating >= 6) return 'warning'; 
    return 'danger';
};

function AllMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [searchParams] = useSearchParams();
  const [filtersReady, setFiltersReady] = useState(false);

  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableAwards, setAvailableAwards] = useState([]);

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedAwards, setSelectedAwards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dateDesc');
  const [viewMode, setViewMode] = useState('grid'); 
  
  useTheme();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pageSize = 8;

  useEffect(() => {
    moviesAPI.getFilters()
      .then(res => {
        setAvailableGenres(res.data.genres || []);
        setAvailableYears(res.data.years || []);
        setAvailableAwards(res.data.awards || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    const genresString = selectedGenres.join(',');
    const awardsString = selectedAwards.join(',');
    loadMovies(page, searchTerm, genresString, selectedYear, sortBy, awardsString);
  }, [page, selectedGenres, selectedYear, selectedAwards, sortBy, filtersReady]); 

  useEffect(() => {
    const genresFromUrl = searchParams.get('genres');
    const yearFromUrl = searchParams.get('year');
    const awardsFromUrl = searchParams.get('awards');
    const searchFromUrl = searchParams.get('search');
    const sortFromUrl = searchParams.get('sort');
    const viewFromUrl = searchParams.get('view');

    if (genresFromUrl) setSelectedGenres(genresFromUrl.split(',').map(g => g.trim()).filter(Boolean));
    if (yearFromUrl) setSelectedYear(yearFromUrl);
    if (awardsFromUrl) setSelectedAwards(awardsFromUrl.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a)));
    if (searchFromUrl) setSearchTerm(searchFromUrl);
    if (sortFromUrl) setSortBy(sortFromUrl);
    if (viewFromUrl) setViewMode(viewFromUrl);

    setPage(1);
    setFiltersReady(true);
  }, []);

  const loadMovies = async (currentPage, currentSearch, currentGenresStr, currentYear, currentSort, currentAwards = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await moviesAPI.getAll(currentPage, pageSize, currentSearch, currentGenresStr, currentYear, currentSort, currentAwards);
      
      const items = response.data.items || [];
      setMovies(items);
      setTotalPages(Math.ceil(response.data.totalCount / pageSize));

      if (items.length === 0) setError('За вашим запитом нічого не знайдено 😔');
    } catch (err) {
      console.error(err);
      setError('Помилка завантаження даних.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    const genresString = selectedGenres.join(',');
    const awardsString = selectedAwards.join(',');
    loadMovies(1, searchTerm, genresString, selectedYear, sortBy, awardsString);
  };

  const toggleGenre = (genre) => {
    setPage(1);
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleYearChange = (e) => {
    setPage(1);
    setSelectedYear(e.target.value);
  };

  const handleSortChange = (e) => {
    setPage(1);
    setSortBy(e.target.value);
  };

  const toggleAward = (awardId) => {
    setPage(1);
    if (selectedAwards.includes(awardId)) {
      setSelectedAwards(selectedAwards.filter(a => a !== awardId));
    } else {
      setSelectedAwards([...selectedAwards, awardId]);
    }
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSearchTerm('');
    setSelectedYear('');
    setSelectedAwards([]);
    setSortBy('dateDesc');
    setPage(1);
  };

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    if (selectedYear) params.set('year', selectedYear);
    if (selectedAwards.length > 0) params.set('awards', selectedAwards.join(','));
    if (searchTerm) params.set('search', searchTerm);
    if (sortBy !== 'dateDesc') params.set('sort', sortBy);
    if (viewMode !== 'grid') params.set('view', viewMode);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [selectedGenres, selectedYear, selectedAwards, searchTerm, sortBy, viewMode, filtersReady]);

  let paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item key={number} active={number === page} onClick={() => setPage(number)}>
        {number}
      </Pagination.Item>
    );
  }

  const renderListView = (movie) => {
    let imageUrl = PLACEHOLDER_IMG;
    let rawPoster = movie.posterUrl || movie.PosterUrl;

    const getCreatedAt = () => {
      if (!movie) return null;
      if (movie.createdAt) return new Date(movie.createdAt);
      if (movie.CreatedAt) return new Date(movie.CreatedAt);
      return null;
    };

    const isNewMovie = (() => {
      const createdAt = getCreatedAt();
      if (!createdAt) return false;
      const diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
      return diffDays <= 45;
    })();

    if (rawPoster) {
       if (rawPoster.startsWith('http')) {
           imageUrl = rawPoster;
       } else {
           const cleanPath = rawPoster.startsWith('/') ? rawPoster : `/${rawPoster}`;
           imageUrl = `${API_BASE_URL}${cleanPath}`;
       }
    }

    const ratingValue = movie.averageRating || movie.rating || 0;

    return (
        <Col key={movie.id} xs={12} className="mb-3">
          <Card className="flex-row shadow-sm h-100 overflow-hidden" style={{ minHeight: '180px', backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div style={{ width: '150px', minWidth: '150px', position: 'relative', backgroundColor: '#e9ecef' }}>
              <Link to={`/movie/${movie.id}`}>
                  <LazyImage
                    src={imageUrl}
                    alt={movie.title}
                    placeholder={PLACEHOLDER_IMG}
                        width={150}
                        height={225}
                        style={{ width: '100%', height: '100%' }}
                  />
              </Link>
            </div>
            
            <Card.Body className="d-flex flex-column py-2">
              <div className="d-flex justify-content-between align-items-start">
                 <div>
                    <h5 className="mb-1">
                        <Link to={`/movie/${movie.id}`} className="text-decoration-none fw-bold" style={{ color: 'var(--text-main)' }}>
                            {movie.title}
                        </Link>
                        {isNewMovie && <Badge bg="success" className="ms-2">Новинка</Badge>}
                    </h5>
                    {movie.director && <small className="text-muted d-block">Режисер: {movie.director}</small>}
                 </div>
                 
                 <Badge 
                    bg={getRatingVariant(ratingValue)} 
                    text="white" 
                    className="fs-6 shadow-sm"
                 >
                    ★ {ratingValue.toFixed(1)}
                 </Badge>
              </div>
              
              <div className="mt-2 mb-2">
                <Badge bg="secondary" className="me-2">{movie.year}</Badge>
                <span className="text-muted small">
                    {Array.isArray(movie.genres) ? movie.genres.join(', ') : movie.genres || movie.genre}
                </span>
              </div>

              <Card.Text className="text-muted small flex-grow-1" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
              }}>
                {movie.description || "Опис відсутній..."}
              </Card.Text>

              <div className="mt-auto text-end">
                <Link to={`/movie/${movie.id}`}>
                      <Button variant="outline-primary" size="sm">Детальніше</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      );
  };

  return (
    <Container className="mt-4 mb-5">
      <h2 className="mb-4">🎬 Каталог фільмів</h2>
      
      <Row className="mb-3">
        <Col md={12}>
          <Form onSubmit={handleSearchSubmit}>
            <InputGroup>
              <Form.Control 
                placeholder="Введіть назву фільму..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shadow-none"
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              />
              
              <Form.Select 
                value={selectedYear} 
                onChange={handleYearChange}
                style={{ maxWidth: '150px', cursor: 'pointer', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                  <option value="">Всі роки</option>
                  {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                  ))}
              </Form.Select>

              <Button variant="primary" type="submit">🔍 Пошук</Button>
              
              {(searchTerm || selectedGenres.length > 0 || selectedYear || selectedAwards.length > 0 || sortBy !== 'dateDesc') && (
                <Button variant="outline-danger" onClick={clearFilters}>✖ Скинути</Button>
              )}
            </InputGroup>
          </Form>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <div 
            className="d-flex flex-wrap gap-2 align-items-center p-3 rounded border"
            style={{
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-color)' 
            }}
          >
            <strong className="me-2" style={{ color: 'var(--text-secondary)' }}>Жанри:</strong>
            {availableGenres.length === 0 && <span className="text-muted small">Завантаження...</span>}
            
            {availableGenres.map(genre => {
              const isActive = selectedGenres.includes(genre);
              return (
                <Badge 
                  key={genre}
                  bg={isActive ? "primary" : ""} 
                  
                  className={`p-2 user-select-none border ${isActive ? '' : ''}`}
                  
                  style={{ 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 'normal',
                      backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                      color: isActive ? 'var(--btn-text)' : 'var(--text-main)',
                      borderColor: isActive ? 'var(--primary-color)' : 'var(--border-color)'
                  }}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  {isActive && <span className="ms-2">✓</span>}
                </Badge>
              );
            })}
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <div 
            className="d-flex flex-wrap gap-2 align-items-center p-3 rounded border"
            style={{
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-color)' 
            }}
          >
            <strong className="me-2" style={{ color: 'var(--text-secondary)' }}>Нагороди:</strong>
            {availableAwards.length === 0 && <span className="text-muted small">Немає даних</span>}
            
            {availableAwards.map(award => {
              const isActive = selectedAwards.includes(award.id);
              return (
                <Badge 
                  key={award.id}
                  bg={isActive ? "success" : ""} 
                  
                  className={`p-2 user-select-none border`}
                  
                  style={{ 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 'normal',
                      backgroundColor: isActive ? 'var(--success-color)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-main)',
                      borderColor: isActive ? 'var(--success-color)' : 'var(--border-color)'
                  }}
                  onClick={() => toggleAward(award.id)}
                  title={award.name}
                >
                  <span>{award.icon}</span>
                  <span className="ms-1">{award.name}</span>
                  {isActive && <span className="ms-2">✓</span>}
                </Badge>
              );
            })}
          </div>
        </Col>
      </Row>

      <Row 
        className="mb-4 align-items-center justify-content-between p-2 rounded shadow-sm border mx-0"
        style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
        }}
      >
        <Col xs="auto" className="d-flex align-items-center">
            <span className="me-2" style={{ color: 'var(--text-secondary)' }}>Сортувати за:</span>
            <Form.Select 
                size="sm" 
                value={sortBy} 
                onChange={handleSortChange} 
                style={{ width: 'auto', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                className="shadow-none form-select-sm"
            >
                {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Form.Select>
        </Col>

        <Col xs="auto">
            <div className="btn-group">
                <Button 
                    variant={viewMode === 'grid' ? "primary" : "outline-secondary"} 
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    title="Плитка"
                >
                    <i className="bi bi-grid-fill"></i> 
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⊞</span> 
                </Button>
                <Button 
                    variant={viewMode === 'list' ? "primary" : "outline-secondary"} 
                    size="sm"
                    onClick={() => setViewMode('list')}
                    title="Список"
                >
                      <i className="bi bi-list"></i>
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>☰</span>
                </Button>
            </div>
        </Col>
      </Row>

      {error && <Alert variant="info">{error}</Alert>}

      {loading ? (
        <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <>
          <Row>
            {movies.map(movie => {
                if (viewMode === 'grid') {
                    return (
                        <Col key={movie.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                            <MovieCard movie={movie} />
                        </Col>
                    );
                } else {
                    return renderListView(movie);
                }
            })}
          </Row>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>{paginationItems}</Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
}

export default AllMoviesPage;