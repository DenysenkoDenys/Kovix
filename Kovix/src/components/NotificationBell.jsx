import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useNavigate } from 'react-router-dom';
import { useFriends } from '../contexts/FriendsContext';
import { useAchievement } from '../contexts/AchievementContext';
import { notificationsAPI, friendsAPI } from '../services/api';
import { FiBell, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { Button } from 'react-bootstrap';
import '../style/NotificationBell.css';

function NotificationBell() {
    const { user } = useAuth();
    const { notificationConnection } = useSignalR();
    const { incomingRequests, requestCount, refreshRequests } = useFriends();
    const { showAchievement } = useAchievement();

    const [simpleNotifications, setSimpleNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const navigate = useNavigate();

    const loadNotifications = useCallback(async () => {
        try {
            const res = await notificationsAPI.getAll();
            setSimpleNotifications(res.data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        if (user) {
            refreshRequests();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadNotifications();
        }
    }, [user, requestCount, loadNotifications, refreshRequests]);

    useEffect(() => {
        if (!notificationConnection || !user) return;

        const handler = (note) => {
            if (note.message.toLowerCase().includes("запит") || note.type === "FriendRequest") {
                refreshRequests();
            }

            setSimpleNotifications(prev => {
                if (prev.some(n => n.id === note.id)) return prev;

                return [{
                    ...note,
                    createdAt: note.createdAt || new Date().toISOString(),
                    isRead: false
                }, ...prev];
            });
        };

        const achievementHandler = (achievement) => {
            if (showAchievement) {
                showAchievement({
                    name: achievement.name,
                    icon: achievement.icon,
                    description: achievement.description
                });
            } else {
                console.warn('showAchievement is not available');
            }

            setSimpleNotifications(prev => [{
                id: Date.now(),
                message: `🏆 ${achievement.name}`,
                type: "Achievement",
                createdAt: new Date().toISOString(),
                isRead: false,
                fromUserId: user?.id  
            }, ...prev]);
        };

        notificationConnection.on('ReceiveNotification', handler);
        notificationConnection.on('AchievementUnlocked', achievementHandler);

        return () => {
            notificationConnection.off('ReceiveNotification', handler);
            notificationConnection.off('AchievementUnlocked', achievementHandler);
        };

    }, [notificationConnection, user, refreshRequests, showAchievement]);

    const removeFriendRequestNotification = (requesterId) => {
        setSimpleNotifications(prev =>
            prev.filter(n =>
                !(n.type === "FriendRequest" && (n.senderId === requesterId || n.fromUserId === requesterId))
            )
        );
    };

    const handleAccept = async (e, requesterId) => {
        e.stopPropagation();
        try {
            await friendsAPI.accept(requesterId);
            removeFriendRequestNotification(requesterId);
            refreshRequests();
        } catch (e) { console.error(e); }
    };

    const handleReject = async (e, requesterId) => {
        e.stopPropagation();
        try {
            await friendsAPI.remove(requesterId);
            removeFriendRequestNotification(requesterId);
            refreshRequests();
        } catch (e) { console.error(e); }
    };

    const handleDeleteNotification = async (e, id, notificationType) => {
        e.stopPropagation();
        try {
            if (notificationType !== "Achievement") {
                await notificationsAPI.delete(id);
            }
            setSimpleNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) { 
            console.error(error);
            setSimpleNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const handleClearAll = async () => {
        try {
            await notificationsAPI.clear();
            setSimpleNotifications([]);
        } catch (e) { console.error(e); }
    };

    const goToProfile = (userId) => {
        navigate(`/users/${userId}`);
        setIsOpen(false);
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.isRead) {
                if (notification.type !== "Achievement") {
                    await notificationsAPI.markAsRead(notification.id);
                }

                setSimpleNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                );
            }

            if (notification.url) {
                setIsOpen(false);
                navigate(notification.url);
            } else if (notification.fromUserId || notification.senderId) {
                const userId = notification.fromUserId || notification.senderId;
                goToProfile(userId);
            }
        } catch (err) {
            console.error("Помилка при кліку на сповіщення:", err);
        }
    };

    const unreadCount = simpleNotifications.filter(n => !n.isRead).length;
    const totalBadgeCount = incomingRequests.length + unreadCount;

    const handleKeyActivate = (e, cb) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            cb();
        }
    };

    return (
        <div className="position-relative">
            <button className="btn position-relative p-0 border-0 notification-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Сповіщення" aria-expanded={isOpen} aria-haspopup="true" aria-controls="notification-menu">
                <FiBell className={`bell-icon ${totalBadgeCount > 0 ? 'text-primary' : ''}`} style={{ fontSize: '1.5rem', color: 'var(--text-main)' }} />
                {totalBadgeCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>{totalBadgeCount}</span>}
            </button>

            {isOpen && (
                <div id="notification-menu" className="card position-absolute end-0 mt-2 shadow" style={{ width: '350px', zIndex: 1050, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                    <div className="card-header fw-bold d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
                        <span>Сповіщення</span>
                        {simpleNotifications.length > 0 && <button onClick={handleClearAll} className="btn btn-link btn-sm p-0 text-decoration-none text-muted" style={{ fontSize: '0.8rem' }} aria-label="Очистити всі сповіщення">Очистити все</button>}
                    </div>

                    <div className="list-group list-group-flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>

                        {incomingRequests.length > 0 && (
                            <div className="p-2 bg-light bg-opacity-10 border-bottom border-secondary">
                                <small className="text-uppercase fw-bold text-primary ms-2" style={{ fontSize: '0.7rem' }}>Запити в друзі</small>
                            </div>
                        )}

                        {incomingRequests.map(req => (
                            <div
                                key={`friend-req-${req.id}`}
                                className="list-group-item p-3 list-group-item-action"
                                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                role="button"
                                tabIndex={0}
                                onClick={() => goToProfile(req.id)}
                                onKeyDown={(e) => handleKeyActivate(e, () => goToProfile(req.id))}
                            >
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 32, height: 32 }}>
                                        {req.username[0].toUpperCase()}
                                    </div>
                                    <div className="lh-1">
                                        <div className="fw-bold">{req.username}</div>
                                        <small className="text-muted">хоче додати вас у друзі</small>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 mt-2">
                                    <Button size="sm" variant="success" className="flex-grow-1 d-flex align-items-center justify-content-center gap-1" onClick={(e) => handleAccept(e, req.id)} aria-label={`Прийняти запит від ${req.username}`}>
                                        <FiCheck aria-hidden="true" /> Прийняти
                                    </Button>
                                    <Button size="sm" variant="outline-danger" className="flex-grow-1 d-flex align-items-center justify-content-center gap-1" onClick={(e) => handleReject(e, req.id)} aria-label={`Відхилити запит від ${req.username}`}>
                                        <FiX aria-hidden="true" /> Відхилити
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {simpleNotifications.length > 0 && incomingRequests.length > 0 && (
                            <div className="p-2 bg-light bg-opacity-10 border-bottom border-secondary mt-2">
                                <small className="text-uppercase fw-bold text-muted ms-2" style={{ fontSize: '0.7rem' }}>Інше</small>
                            </div>
                        )}

                        {simpleNotifications.map((note) => {
                            if (note.message.toLowerCase().includes("запит у друзі") && incomingRequests.some(r => note.message.includes(r.username))) return null;

                            const isClickable = !!(note.url || note.fromUserId || note.senderId);

                            return (
                                <div
                                    key={`sys-note-${note.id}`}
                                    className={`list-group-item d-flex justify-content-between align-items-start p-3 ${isClickable ? 'list-group-item-action' : ''}`}
                                    style={{
                                        backgroundColor: !note.isRead ? 'rgba(13, 110, 253, 0.08)' : 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: isClickable ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onClick={() => isClickable && handleNotificationClick(note)}
                                    role={isClickable ? 'button' : undefined}
                                    tabIndex={isClickable ? 0 : undefined}
                                    onKeyDown={isClickable ? (e) => handleKeyActivate(e, () => handleNotificationClick(note)) : undefined}
                                >
                                    <div className="d-flex gap-2 w-100">
                                        {!note.isRead && (
                                            <div style={{
                                                width: '8px', height: '8px', backgroundColor: '#0d6efd',
                                                borderRadius: '50%', marginTop: '6px', flexShrink: 0
                                            }} />
                                        )}

                                        <div className="flex-grow-1">
                                            <div className={`small ${!note.isRead ? 'fw-bold' : ''} ${note.message.toLowerCase().includes('скарга') ? 'text-danger' : ''}`}>
                                                {note.message}
                                            </div>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                {new Date(note.createdAt).toLocaleString()}
                                            </small>
                                        </div>

                                        {note.id && (
                                            <button className="btn btn-link text-danger p-0 ms-2" onClick={(e) => handleDeleteNotification(e, note.id, note.type)} aria-label="Видалити сповіщення">
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {totalBadgeCount === 0 && <div className="text-center py-4 text-muted">Сповіщень немає 🔕</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;