import { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner } from 'react-bootstrap';
import { moviesAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/apiConfig';
import '../style/TierListBuilder.css';

const DEFAULT_TIERS = [
  { id: 'S', name: 'S', color: '#FF6B6B' },
  { id: 'A', name: 'A', color: '#4ECDC4' },
  { id: 'B', name: 'B', color: '#45B7D1' },
  { id: 'C', name: 'C', color: '#FFA502' },
  { id: 'D', name: 'D', color: '#95E1D3' },
  { id: 'F', name: 'F', color: '#C7CEEA' }
];

function TierListBuilder({ items, onItemsChange, tierListId, tiersConfig }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [bankMovies, setBankMovies] = useState([]);
  const [loadingBank, setLoadingBank] = useState(true);
  const [draggedData, setDraggedData] = useState(null);
  
  const tiers = tiersConfig || DEFAULT_TIERS;
  const tierIds = tiers.map(t => t.id);

  useEffect(() => {
    loadMoviesToBank('');
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadMoviesToBank(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const loadMoviesToBank = async (query) => {
    setLoadingBank(true);
    try {
      const response = await moviesAPI.getAll(1, 100, query);
      const fetchedMovies = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.items || response.data?.results || response.data?.data || []);
      
      setBankMovies(fetchedMovies);
    } catch (error) {
      console.error('Помилка завантаження банку фільмів:', error);
      setBankMovies([]);
    } finally {
      setLoadingBank(false);
    }
  };

  const availableBankMovies = bankMovies.filter(
    movie => !items.find(item => item.movieId === movie.id)
  );

  const handleDragStart = (e, source, data) => {
    setDraggedData({ source, data });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTier = (e, targetTier) => {
    e.preventDefault();
    if (!draggedData) return;

    if (draggedData.source === 'BANK') {
      const newItem = {
        id: Math.random(),
        movieId: draggedData.data.id,
        movieTitle: draggedData.data.title,
        moviePosterUrl: draggedData.data.posterUrl,
        tier: targetTier,
        position: items.filter(i => i.tier === targetTier).length
      };
      onItemsChange([...items, newItem]);
    } else if (draggedData.source === 'TIER' && draggedData.data.tier !== targetTier) {
      const updatedItems = items.map(item =>
        item.id === draggedData.data.id ? { ...item, tier: targetTier } : item
      );
      onItemsChange(updatedItems);
    }
    setDraggedData(null);
  };

  const handleDropOnBank = (e) => {
    e.preventDefault();
    if (!draggedData) return;

    if (draggedData.source === 'TIER') {
      onItemsChange(items.filter(item => item.id !== draggedData.data.id));
    }
    setDraggedData(null);
  };

  const handleRemoveFromTier = (itemId) => {
    onItemsChange(items.filter(item => item.id !== itemId));
  };

  const handleChangeTier = (itemId, newTier) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, tier: newTier } : item
    );
    onItemsChange(updatedItems);
  };

  const groupedByTier = tierIds.reduce((acc, tier) => {
    acc[tier] = items.filter(item => item.tier === tier);
    return acc;
  }, {});

  const renderBankCard = (movie) => (
    <div
      key={movie.id}
      className="tier-item shadow-sm"
      draggable
      onDragStart={(e) => handleDragStart(e, 'BANK', movie)}
      style={{ width: '120px', minWidth: '120px', cursor: 'grab' }}
    >
      <div className="tier-item-poster" style={{ height: '180px' }}>
        {movie.posterUrl ? (
          <img src={resolveMediaUrl(movie.posterUrl)} alt={movie.title} />
        ) : (
          <div className="poster-placeholder" style={{ backgroundColor: 'var(--bg-card)' }}>
            {movie.title}
          </div>
        )}
      </div>
      <div className="p-2 text-center text-truncate small fw-bold" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderTop: '1px solid var(--border-color)' }}>
        {movie.title}
      </div>
    </div>
  );

  const renderTierCard = (item) => (
    <div
      key={item.id}
      className="tier-item"
      draggable
      onDragStart={(e) => handleDragStart(e, 'TIER', item)}
    >
      <div className="tier-item-poster">
        {item.moviePosterUrl ? (
          <img src={resolveMediaUrl(item.moviePosterUrl)} alt={item.movieTitle} />
        ) : (
          <div className="poster-placeholder" style={{ backgroundColor: 'var(--bg-card)' }}>
            {item.movieTitle}
          </div>
        )}
      </div>

      <div className="tier-item-info" style={{ backgroundColor: 'var(--bg-card)' }}>
        <p className="tier-item-title text-truncate" style={{ color: 'var(--text-main)' }} title={item.movieTitle}>
          {item.movieTitle}
        </p>
        
        <Form.Select
          size="sm"
          value={item.tier}
          onChange={(e) => handleChangeTier(item.id, e.target.value)}
          className="mb-2 fw-bold"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
        >
          {tiers.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Form.Select>

        <Button
          size="sm"
          variant="danger"
          onClick={() => handleRemoveFromTier(item.id)}
          className="w-100"
        >
          Видалити
        </Button>
      </div>
    </div>
  );

  return (
    <div className="tier-list-builder">
      <Card className="mb-4 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0" style={{ color: 'var(--text-main)' }}>🔍 Пошук фільмів</h5>
            <Form.Control
              type="text"
              placeholder="Введіть назву фільму..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '60%', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
            />
          </div>
        </Card.Body>
      </Card>

      <Card className="tier-list-table mb-4 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Card.Body className="p-0">
          {tiers.map(tier => (
            <div key={tier.id} className="tier-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div 
                className="tier-label"
                style={{ backgroundColor: tier.color }}
              >
                <strong style={{ color: '#fff', fontSize: '1.5rem' }}>{tier.name}</strong>
              </div>

              <div 
                className="tier-items-container"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnTier(e, tier.id)}
                style={{ backgroundColor: 'var(--bg-main)' }}
              >
                {groupedByTier[tier.id].length === 0 ? (
                  <div className="tier-empty-message text-muted" style={{ opacity: 0.6 }}>
                    Перетягніть фільм сюди
                  </div>
                ) : (
                  <div className="tier-items">
                    {groupedByTier[tier.id].map(item => renderTierCard(item))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Card className="shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Card.Header style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
          <h5 className="mb-0" style={{ color: 'var(--text-main)' }}>
            Перелік всіх фільмів <span className="text-muted fs-6">({availableBankMovies.length})</span>
          </h5>
        </Card.Header>
        <Card.Body 
          className="tier-items-container p-3"
          onDragOver={handleDragOver}
          onDrop={handleDropOnBank}
          style={{ 
            backgroundColor: 'var(--bg-main)', 
            minHeight: '220px', 
            maxHeight: '400px',
            overflowY: 'auto',
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px',
          }}
        >
          {loadingBank ? (
            <div className="w-100 d-flex justify-content-center align-items-center">
              <Spinner animation="border" style={{ color: 'var(--text-main)' }} />
            </div>
          ) : availableBankMovies.length === 0 ? (
            <div className="text-muted w-100 text-center mt-5">
              {searchQuery ? "Фільми не знайдені. Спробуйте іншу назву." : "Всі фільми вже розподілені!"}
            </div>
          ) : (
            availableBankMovies.map(movie => renderBankCard(movie))
          )}
        </Card.Body>
      </Card>

    </div>
  );
}

export default TierListBuilder;