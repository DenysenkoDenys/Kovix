import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Alert, Row, Col, Badge } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/apiConfig';

const QuizStatsComponent = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadQuizStats();
    const interval = setInterval(loadQuizStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadQuizStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/quiz-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setStats(null);
          return;
        }
        throw new Error('Не вдалося завантажити статистику');
      }

      const data = await response.json();
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Помилка при завантаженні статистики квізу:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" style={{ color: 'var(--primary-color)' }} />
        </Card.Body>
      </Card>
    );
  }

  if (!stats || stats.totalQuizzesCompleted === 0) {
    return null;
  }

  const getAverageColor = (rating) => {
    if (rating >= 80) return 'success';
    if (rating >= 60) return 'warning';
    if (rating >= 40) return 'info';
    return 'danger';
  };

  return (
    <Card className="shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <Card.Body>
        <h4 className="mb-4" style={{ color: 'var(--text-main)' }}>
          Статистика тестів знання фільмів
        </h4>

        <Row className="mb-4">
          <Col xs={12} sm={6} md={3} className="mb-3">
            <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--bg-main)' }}>
              <div className="text-muted small mb-2">Пройдено тестів</div>
              <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
                {stats.totalQuizzesCompleted}
              </h3>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3} className="mb-3">
            <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--bg-main)' }}>
              <div className="text-muted small mb-2">Середній рейтинг</div>
              <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
                {stats.averageRating.toFixed(1)}
              </h3>
              <small style={{ color: 'var(--text-secondary)' }}>/100</small>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3} className="mb-3">
            <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--bg-main)' }}>
              <div className="text-muted small mb-2">Найвищий</div>
              <h3 style={{ color: '#28a745', margin: 0 }}>
                {stats.highestRating}
              </h3>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3} className="mb-3">
            <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--bg-main)' }}>
              <div className="text-muted small mb-2">Найнижчий</div>
              <h3 style={{ color: '#dc3545', margin: 0 }}>
                {stats.lowestRating}
              </h3>
            </div>
          </Col>
        </Row>

        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ color: 'var(--text-main)' }}>Загальна успішність</span>
            <Badge bg={getAverageColor(stats.averageRating)}>
              {stats.averageRating.toFixed(1)}/100
            </Badge>
          </div>
          <div className="progress" style={{ height: '8px', backgroundColor: 'var(--bg-main)' }}>
            <div
              className="progress-bar"
              style={{
                width: `${stats.averageRating}%`,
                backgroundColor: 
                  stats.averageRating >= 80 ? '#28a745' :
                  stats.averageRating >= 60 ? '#ffc107' :
                  stats.averageRating >= 40 ? '#17a2b8' :
                  '#dc3545'
              }}
            />
          </div>
        </div>

        {stats.recentResults && stats.recentResults.length > 0 && (
          <div>
            <h5 className="mb-3" style={{ color: 'var(--text-main)' }}>
              Останні результати
            </h5>
            
            <div 
              className="d-flex flex-column gap-2 pe-2" 
              style={{ 
                maxHeight: '250px',
                overflowY: 'auto',
                paddingRight: '5px'
              }}
            >
              <style>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: var(--bg-main); }
                ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #555; }
              `}</style>

              {stats.recentResults.map((result) => (
                <div
                  key={result.id}
                  className="d-flex justify-content-between align-items-center p-2 rounded"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderLeft: `3px solid ${
                      result.rating >= 80 ? '#28a745' :
                      result.rating >= 60 ? '#ffc107' :
                      result.rating >= 40 ? '#17a2b8' :
                      '#dc3545'
                    }`
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                      <a
                        onClick={() => navigate(`/movie/${result.movieId}`)}
                        style={{ cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}
                      >
                        {result.movieTitle}
                      </a>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {result.correctAnswers}/{result.totalQuestions} правильних
                    </div>
                  </div>
                  <Badge bg={result.rating >= 80 ? 'success' : result.rating >= 60 ? 'warning' : 'info'}>
                    {result.rating}/100
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QuizStatsComponent;