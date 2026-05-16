import { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Badge, ButtonGroup, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reviews');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeaders = async () => {
            setLoading(true);
            try {
                const res = await usersAPI.getLeaderboard(activeTab, 50);
                setLeaders(res.data);
            } catch (err) {
                console.error("Помилка завантаження лідерів:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaders();
    }, [activeTab]);

    const getRankBadge = (index) => {
        switch (index) {
            case 0: return { icon: '🥇', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' };
            case 1: return { icon: '🥈', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)' };
            case 2: return { icon: '🥉', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
            default: return { icon: `${index + 1}`, color: 'var(--text-secondary)', bg: 'transparent' };
        }
    };

    return (
        <Container className="my-5" style={{ color: 'var(--text-main)', maxWidth: '900px' }}>
            <div className="text-center mb-4">
                <h1 className="fw-bold" style={{ color: 'var(--primary-color)' }}>🏆 Таблиця лідерів</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Змагайтеся з іншими користувачами Kovix</p>
            </div>

            <div className="d-flex justify-content-center mb-5">
                <ButtonGroup className="shadow-sm">
                    <Button
                        variant={activeTab === 'reviews' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('reviews')}
                        style={{
                            padding: '10px 20px',
                            fontWeight: 'bold',
                            backgroundColor: activeTab === 'reviews' ? 'var(--primary-color)' : 'transparent',
                            borderColor: 'var(--primary-color)',
                            color: activeTab === 'reviews' ? '#fff' : 'var(--primary-color)'
                        }}
                    >
                        📝 За відгуками
                    </Button>
                    <Button
                        variant={activeTab === 'tests' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('tests')}
                        style={{
                            padding: '10px 20px',
                            fontWeight: 'bold',
                            backgroundColor: activeTab === 'tests' ? 'var(--primary-color)' : 'transparent',
                            borderColor: 'var(--primary-color)',
                            color: activeTab === 'tests' ? '#fff' : 'var(--primary-color)'
                        }}
                    >
                        🧠 За тестами
                    </Button>
                </ButtonGroup>
            </div>

            <Card className="shadow-lg border-0" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', minHeight: '400px' }}>
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center h-100 py-5">
                        <Spinner animation="border" style={{ color: 'var(--primary-color)' }} />
                    </div>
                ) : (
                    <Table hover responsive className="mb-0 align-middle" style={{ color: 'var(--text-main)' }}>
                        <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                            <tr>
                                <th className="text-center py-3" style={{ width: '80px', color: 'var(--text-secondary)', borderBottomColor: 'var(--border-color)' }}>Місце</th>
                                <th className="py-3" style={{ color: 'var(--text-secondary)', borderBottomColor: 'var(--border-color)' }}>Користувач</th>
                                <th className="text-center py-3" style={{ color: 'var(--text-secondary)', borderBottomColor: 'var(--border-color)' }}>
                                    {activeTab === 'reviews' ? 'Відгуків' : 'Балів за тести'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaders.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-5 text-muted">
                                        Поки що немає лідерів у цій категорії.
                                    </td>
                                </tr>
                            ) : (
                                leaders.map((user, index) => {
                                    const rank = getRankBadge(index);
                                    const isTop3 = index < 3;
                                    const scoreValue = activeTab === 'reviews' ? user.reviewsCount : user.testScore;

                                    return (
                                        <tr
                                            key={user.id}
                                            onClick={() => navigate(`/users/${user.id}`)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: rank.bg,
                                                transition: 'background-color 0.2s'
                                            }}
                                            className="leaderboard-row"
                                        >
                                            <td className="text-center fw-bold fs-4 py-3" style={{ color: rank.color, borderColor: 'var(--border-color)' }}>
                                                {rank.icon}
                                            </td>

                                            <td className="py-3" style={{ borderColor: 'var(--border-color)' }}>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold overflow-hidden shadow-sm"
                                                        style={{
                                                            width: isTop3 ? '55px' : '45px',
                                                            height: isTop3 ? '55px' : '45px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            border: `2px solid ${isTop3 ? rank.color : 'var(--border-color)'}`
                                                        }}
                                                    >
                                                        {user.avatarUrl ? (
                                                            <img src={`${getApiBaseUrl()}${user.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            user.username[0].toUpperCase()
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: isTop3 ? '1.1rem' : '1rem', color: isTop3 ? rank.color : 'var(--text-main)' }}>
                                                            {user.username}
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                            {user.role === 'Admin' || user.role === 'Moderator' ? (
                                                                <Badge bg={user.role === 'Admin' ? 'danger' : 'info'} className="text-white" style={{ fontSize: '0.7rem' }}>
                                                                    {user.role}
                                                                </Badge>
                                                            ) : null}

                                                            {user.selectedAwardIcon && (
                                                                <span title={user.selectedAwardName} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                    {user.selectedAwardIcon} {user.selectedAwardName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="text-center fw-bold py-3" style={{ fontSize: isTop3 ? '1.2rem' : '1rem', color: 'var(--primary-color)', borderColor: 'var(--border-color)' }}>
                                                {scoreValue} {activeTab === 'tests' && <span style={{ fontSize: '0.8rem', color: '#ffc107' }}>XP</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                )}
            </Card>

            <style>{`
                .leaderboard-row:hover {
                    background-color: rgba(33, 150, 243, 0.1) !important;
                }
            `}</style>
        </Container>
    );
}