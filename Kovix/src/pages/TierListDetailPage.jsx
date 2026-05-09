import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tierListsAPI } from '../services/api';
import TierListReactions from '../components/TierListReactions';
import '../style/TierListDetailPage.css';

const DEFAULT_TIERS = [
  { id: 'S', name: 'S', color: '#FF6B6B' },
  { id: 'A', name: 'A', color: '#4ECDC4' },
  { id: 'B', name: 'B', color: '#45B7D1' },
  { id: 'C', name: 'C', color: '#FFA502' },
  { id: 'D', name: 'D', color: '#95E1D3' },
  { id: 'F', name: 'F', color: '#C7CEEA' }
];

function TierListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tierList, setTierList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tiersConfig, setTiersConfig] = useState(DEFAULT_TIERS);

  useEffect(() => {
    loadTierList();
  }, [id]);

  const loadTierList = async () => {
    try {
      const response = await tierListsAPI.getById(id);
      setTierList(response.data);
      
      if (response.data.tiersConfig) {
        if (typeof response.data.tiersConfig === 'string') {
          try {
            setTiersConfig(JSON.parse(response.data.tiersConfig));
          } catch {
            setTiersConfig(DEFAULT_TIERS);
          }
        } else if (Array.isArray(response.data.tiersConfig)) {
          setTiersConfig(response.data.tiersConfig);
        }
      }
    } catch (error) {
      console.error('Помилка завантаження:', error);
      setError('Не вдалося завантажити тір ліст');
    } finally {
      setLoading(false);
    }
  };

  const groupedByTier = tierList ? 
    tierList.items.reduce((acc, item) => {
      if (!acc[item.tier]) acc[item.tier] = [];
      acc[item.tier].push(item);
      return acc;
    }, {}) : {};

  const getTierConfig = (tierId) => {
    return tiersConfig.find(t => t.id === tierId) || { id: tierId, name: tierId, color: '#ccc' };
  };

  const sortedTiers = tiersConfig.filter(tier => tierList && groupedByTier[tier.id]?.length > 0);

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !tierList) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => navigate('/tierlists')}>Повернутися до тір лістів</Button>
      </Container>
    );
  }

  const isOwner = user?.id === tierList.userId;
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Approved':
        return 'Схвалено';
      case 'Pending':
        return 'На модерації';
      case 'Rejected':
        return 'Відхилено';
      default:
        return 'Невідомо';
    }
  };

  return (
    <Container className="mt-4 mb-5">
      <Button 
        variant="outline-secondary" 
        className="mb-4"
        onClick={() => navigate('/tierlists')}
      >
        ← Повернутися
      </Button>

      <Row>
        <Col lg={3}>
          <Card className="mb-4">
            <Card.Body>
              <h4>{tierList.title}</h4>
              
              <div className="mb-3">
                {tierList.isPublic && (
                  <Badge bg={getStatusColor(tierList.status)} className="me-2">
                    {getStatusLabel(tierList.status)}
                  </Badge>
                )}
                {!tierList.isPublic && (
                  <Badge bg="secondary">Приватний</Badge>
                )}
              </div>

              {tierList.description && (
                <p className="text-muted mb-3">{tierList.description}</p>
              )}

              <div className="mb-4">
                <p className="mb-2"><strong>Автор:</strong> <Link to={`/users/${tierList.userId}`}>{tierList.username}</Link></p>
                <p className="mb-2"><strong>Фільмів:</strong> {tierList.items.length}</p>
                <p className="mb-2"><strong>Створено:</strong> {new Date(tierList.createdAt).toLocaleDateString('uk-UA')}</p>
                {tierList.updatedAt && (
                  <p className="mb-2"><strong>Оновлено:</strong> {new Date(tierList.updatedAt).toLocaleDateString('uk-UA')}</p>
                )}
              </div>

              {tierList.adminComment && (
                <Alert variant="warning" className="mb-3">
                  <strong>Коментар модератора:</strong>
                  <p className="mb-0 mt-2">{tierList.adminComment}</p>
                </Alert>
              )}

              {isOwner && (
                <div className="d-grid gap-2">
                  <Link to={`/tierlists/${tierList.id}/edit`}>
                    <Button variant="primary" className="w-100">
                      Редагувати
                    </Button>
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          <div className="tier-list-display">
            {sortedTiers.length === 0 ? (
              <Card>
                <Card.Body className="text-center py-5">
                  <p>Цей тір ліст ще не містить фільмів</p>
                </Card.Body>
              </Card>
            ) : (
              sortedTiers.map(tier => (
                <div key={tier.id} className="tier-row mb-4">
                  <div 
                    className="tier-label"
                    style={{ backgroundColor: tier.color }}
                  >
                    <strong style={{ fontSize: '24px', color: 'white' }}>{tier.name}</strong>
                  </div>

                  <div className="tier-content">
                    <div className="tier-items-grid">
                      {groupedByTier[tier.id]?.map(item => (
                        <Link 
                          key={item.id}
                          to={`/movie/${item.movieId}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <div className="tier-item-poster">
                            {item.moviePosterUrl ? (
                              <img 
                                src={item.moviePosterUrl} 
                                alt={item.movieTitle}
                                className="img-fluid"
                                title={item.movieTitle}
                              />
                            ) : (
                              <div className="poster-placeholder">
                                {item.movieTitle}
                              </div>
                            )}
                            <div className="poster-hover-title">
                              {item.movieTitle}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Col>
      </Row>
      <TierListReactions tierListId={tierList.id} />
    </Container>
  );
}

export default TierListDetailPage;