import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Card, Alert, Spinner, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tierListsAPI, moviesAPI } from '../services/api';
import TierListBuilder from '../components/TierListBuilder';
import '../style/EditTierListPage.css';

const DEFAULT_TIERS = [
  { id: 'S', name: 'S', color: '#FF6B6B' },
  { id: 'A', name: 'A', color: '#4ECDC4' },
  { id: 'B', name: 'B', color: '#45B7D1' },
  { id: 'C', name: 'C', color: '#FFA502' },
  { id: 'D', name: 'D', color: '#95E1D3' },
  { id: 'F', name: 'F', color: '#C7CEEA' }
];

function EditTierListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tierList, setTierList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);
  const [tiersConfig, setTiersConfig] = useState(DEFAULT_TIERS);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);

  const getFallbackTierId = (tiers) => tiers[0]?.id || 'S';

  const normalizeItemsToTiers = (listItems, tiers) => {
    const validTierIds = new Set(tiers.map(t => t.id));
    const fallbackTierId = getFallbackTierId(tiers);

    return listItems.map((item) => (
      validTierIds.has(item.tier)
        ? item
        : { ...item, tier: fallbackTierId }
    ));
  };

  useEffect(() => {
    loadTierList();
  }, [id]);

  const loadTierList = async () => {
    try {
      const response = await tierListsAPI.getById(id);
      const tl = response.data;
      
      if (!user || tl.userId !== user.id) {
        setError('Ви не маєте доступу до цього тір ліста');
        setLoading(false);
        return;
      }

      setTierList(tl);
      setTitle(tl.title);
      setDescription(tl.description || '');
      setItems(tl.items || []);
      
      if (tl.tiersConfig) {
        if (typeof tl.tiersConfig === 'string') {
          try {
            setTiersConfig(JSON.parse(tl.tiersConfig));
          } catch {
            setTiersConfig(DEFAULT_TIERS);
          }
        } else if (Array.isArray(tl.tiersConfig)) {
          setTiersConfig(tl.tiersConfig);
        }
      }
    } catch (error) {
      console.error('Помилка завантаження:', error);
      setError('Не вдалося завантажити тір ліст');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Введіть назву тір ліста');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      const safeItems = normalizeItemsToTiers(items, tiersConfig);
      const itemsDto = items.map((item, index) => ({
        movieId: item.movieId,
        tier: safeItems[index]?.tier ?? item.tier,
        position: index
      }));

      await tierListsAPI.update(id, {
        title,
        description,
        items: itemsDto,
        tiersConfig: tiersConfig
      });

      const updatedResponse = await tierListsAPI.getById(id);
      setTierList(updatedResponse.data);

      if (tierList?.isPublic && tierList?.status === 'Approved' && 
          updatedResponse.data.status === 'Pending') {
        setSuccess('Тір ліст збережено! Зміни відправлено на модерацію.');
      } else {
        setSuccess('Тір ліст збережено успішно!');
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Помилка при збереженні:', error);
      if (error.response?.data) {
        setError(`Помилка: ${error.response.data}`);
      } else {
        setError('Помилка при збереженні тір ліста');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await tierListsAPI.share(id);
      setTierList(prev => ({ ...prev, isPublic: true, status: 'Pending' }));
      setShowShareModal(false);
      setSuccess('Тір ліст відправлено на модерацію!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Помилка при діленні:', error);
      setError('Помилка при діленні тір ліста');
    }
  };

  const handleUnshare = async () => {
    try {
      await tierListsAPI.unshare(id);
      setTierList(prev => ({ ...prev, isPublic: false }));
      setSuccess('Тір ліст зроблено приватним!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Помилка при зміні статусу:', error);
      setError('Помилка при зміні статусу тір ліста');
    }
  };

  const handleGoBack = () => {
    navigate('/tierlists');
  };

  const handleAddTier = () => {
    const usedIds = new Set(tiersConfig.map(t => t.id));
    let newId = 'T1';
    for (let i = 1; i <= 99; i++) {
      const candidate = `T${i}`;
      if (!usedIds.has(candidate)) {
        newId = candidate;
        break;
      }
    }
    const newTier = {
      id: newId,
      name: newId,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };
    setTiersConfig([...tiersConfig, newTier]);
  };

  const handleRemoveTier = (tierId) => {
    if (tiersConfig.length <= 1) {
      alert('Повинен бути хоча б один рівень');
      return;
    }
    const nextTiers = tiersConfig.filter(t => t.id !== tierId);
    const fallbackTierId = getFallbackTierId(nextTiers);

    setTiersConfig(nextTiers);
    setItems(prevItems => normalizeItemsToTiers(
      prevItems.map(item => (
        item.tier === tierId ? { ...item, tier: fallbackTierId } : item
      )),
      nextTiers
    ));
  };

  const handleUpdateTier = (tierId, field, value) => {
    setTiersConfig(tiersConfig.map(t =>
      t.id === tierId ? { ...t, [field]: value } : t
    ));
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error && !tierList) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={handleGoBack}>Повернутися</Button>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      <Button 
        variant="outline-secondary" 
        className="mb-4"
        onClick={handleGoBack}
      >
        ← Повернутися
      </Button>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col lg={3}>
          <Card className="mb-4">
            <Card.Body>
              <h5>Інформація</h5>
              
              <Form.Group className="mb-3">
                <Form.Label>Назва</Form.Label>
                <Form.Control
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
                <small className="text-muted">{title.length}/200</small>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Опис</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
                <small className="text-muted">{description.length}/1000</small>
              </Form.Group>

              <div className="mb-3">
                <p><strong>Статус:</strong> {tierList?.isPublic ? 'Публічний' : 'Приватний'}</p>
                {tierList?.isPublic && (
                  <p><strong>Модерація:</strong> {tierList?.status}</p>
                )}
              </div>

              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Збереження...' : 'Зберегти зміни'}
                </Button>

                {!tierList?.isPublic ? (
                  <Button 
                    variant="info"
                    onClick={() => setShowShareModal(true)}
                  >
                    Поділитися
                  </Button>
                ) : (
                  <Button 
                    variant="outline-danger"
                    onClick={handleUnshare}
                  >
                    Зробити приватним
                  </Button>
                )}

                <Button 
                  variant="secondary" 
                  onClick={() => setShowTiersModal(true)}
                >
                  ⚙️ Редагувати рівні
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <h6>Кількість фільмів: {items.length}</h6>
              <small className="text-muted">Додавайте фільми до тір ліста нижче</small>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          <TierListBuilder 
            items={items}
            onItemsChange={setItems}
            tierListId={id}
            tiersConfig={tiersConfig}
          />
        </Col>
      </Row>

      <Modal show={showShareModal} onHide={() => setShowShareModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Поділитися тір лістом</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Ви впевнені, що хочете поділитися цим тір лістом?</p>
          <p>Тір ліст буде відправлено на модерацію перед публікацією.</p>
          <Alert variant="info">
            Після схвалення модератором, інші користувачі зможуть переглядати ваш тір ліст.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            Скасувати
          </Button>
          <Button variant="primary" onClick={handleShare}>
            Поділитися
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showTiersModal} onHide={() => setShowTiersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Редагування рівнів тір ліста</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Налаштуйте рівні для вашого тір ліста</p>
          <div className="mb-3">
            {tiersConfig.map((tier, index) => (
              <div key={tier.id} className="d-flex gap-2 mb-2 align-items-center p-2 border rounded">
                <input
                  type="color"
                  value={tier.color}
                  onChange={(e) => handleUpdateTier(tier.id, 'color', e.target.value)}
                  style={{ width: '50px', height: '40px', cursor: 'pointer' }}
                />
                <Form.Control
                  type="text"
                  value={tier.name}
                  onChange={(e) => handleUpdateTier(tier.id, 'name', e.target.value)}
                  placeholder="Назва рівня"
                  maxLength={20}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveTier(tier.id)}
                  disabled={tiersConfig.length <= 1}
                >
                  Видалити
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={handleAddTier}
            className="mb-3"
          >
            + Додати рівень
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTiersModal(false)}>
            Закрити
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default EditTierListPage;