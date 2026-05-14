import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Modal, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI, friendsAPI, usersAPI } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HubConnectionState } from '@microsoft/signalr';
import { useChatConnection } from '../hooks/useChatConnection';
import { getApiBaseUrl } from '../utils/apiConfig';
import UserTitleBadge from '../components/UserTitleBadge';
import MessageReactions from '../components/MessageReactions';
import MessageReply from '../components/MessageReply';
import TypingIndicator from '../components/TypingIndicator';
import '../style/App.css';

const formatMessageDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = now - date;
    const oneWeek = 1000 * 60 * 60 * 60 * 24 * 7;

    if (date >= startOfToday) return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    if (diffTime < oneWeek) return date.toLocaleDateString('uk-UA', { weekday: 'short' });
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
};

function ChatPage() {
    const { user } = useAuth();
    const [isBlocked, setIsBlocked] = useState(false);
    const chatContainerRef = useRef(null);

    const checkIfAccountBlocked = useCallback(async () => {
        if (!user) return;
        try {
            const res = await usersAPI.getPublicProfile(user.id);
            setIsBlocked(res.data.isBlocked);
        } catch (e) {
            console.error(e);
        }
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        checkIfAccountBlocked();
    }, [checkIfAccountBlocked]);

    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [friends, setFriends] = useState([]);
    const navigate = useNavigate();

    const [generalChat, setGeneralChat] = useState({
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0
    });

    const [editingId, setEditingId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const messagesEndRef = useRef(null);
    const activeChatRef = useRef(activeChat);

    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    const [highlightedMsgId, setHighlightedMsgId] = useState(null);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [targetMessage, setTargetMessage] = useState(null);

    const [typingUsers, setTypingUsers] = useState([]);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const typingTimeoutRef = useRef(null);
    const [reactionsTrigger, setReactionsTrigger] = useState({});
    const [repliesTrigger, setRepliesTrigger] = useState({});
    const [pinsTrigger, setPinsTrigger] = useState(0);
    const [showPinnedModal, setShowPinnedModal] = useState(false);
    const [showPinTypeModal, setShowPinTypeModal] = useState(false);
    const [messageToPinType, setMessageToPinType] = useState(null);

    const sortedPins = [...pinnedMessages].sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
    const latestPin = sortedPins.length > 0 ? sortedPins[0] : null;

    const [searchParams] = useSearchParams();
    const forcedChatId = searchParams.get('activeChat');
    const targetMessageId = searchParams.get('messageId');

    const scrollToPinnedMessage = (messageId) => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(messageId);
            setTimeout(() => setHighlightedMsgId(null), 3000);
        }
    };

    const canManagePinsInGlobal = user?.role === 'Admin' || user?.role === 'Moderator';
    const isGlobalChat = activeChat === null;

    const handleUnpin = async (messageId, isPinForSelf = false, e) => {
        if (e) e.stopPropagation();
        try {
            console.log(`Спроба відкріпити повідомлення ${messageId}`);
            await chatAPI.pinMessage(messageId, !isPinForSelf, isPinForSelf);
            console.log(`Повідомлення ${messageId} успішно оновлено`);
            setPinsTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Помилка відкріплення:", err);
        }
    };

    const canUnpinMessage = (pinnedByName) => {
        if (isGlobalChat) {
            return canManagePinsInGlobal;
        }
        return pinnedByName === user?.username || user?.role === 'Admin' || user?.role === 'Moderator';
    };

    const canPinMessage = () => {
        if (isGlobalChat) {
            return canManagePinsInGlobal;
        }
        return true;
    };

    const handlePinMessageWithType = (message) => {
        if (!canPinMessage()) {
            alert('У вас немає дозволу закріплювати повідомлення в глобальному чаті');
            return;
        }
        setMessageToPinType(message);
        setShowPinTypeModal(true);
    };

    const pinMessageForType = async (isPinForEveryone) => {
        if (!messageToPinType) return;
        try {
            await chatAPI.pinMessage(messageToPinType.id, isPinForEveryone, !isPinForEveryone);
            console.log(`Повідомлення закріплено (для ${isPinForEveryone ? 'всіх' : 'себе'})`);
            setPinsTrigger(prev => prev + 1);
            setShowPinTypeModal(false);
            setMessageToPinType(null);
        } catch (err) {
            console.error('Помилка закріплення:', err);
        }
    };

    const scrollToBottom = () => {
        if (!targetMessageId && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        let currentActiveId = null;
        if (forcedChatId) {
            currentActiveId = parseInt(forcedChatId);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveChat(currentActiveId);
            chatAPI.markAsRead(currentActiveId).catch(console.error);
        } else {
            chatAPI.markGeneralAsRead().catch(console.error);
        }

        friendsAPI.getMyFriends()
            .then(res => {
                const processedFriends = res.data.map(f => {
                    if (currentActiveId && f.id === currentActiveId) {
                        return { ...f, unreadCount: 0 };
                    }
                    return f;
                });
                setFriends(processedFriends);
            })
            .catch(console.error);

        chatAPI.getGeneralChatInfo()
            .then(res => {
                if (res.data) {
                    setGeneralChat(prev => ({
                        ...prev,
                        lastMessage: res.data.lastMessage || '',
                        lastMessageTime: res.data.lastMessageTime,
                        unreadCount: (currentActiveId === null) ? 0 : (res.data.unreadCount || 0)
                    }));
                }
            })
            .catch(console.error);
    }, [forcedChatId]);

    useEffect(() => {
        if (targetMessageId && messages.length > 0) {
            setTimeout(() => {
                const element = document.getElementById(`msg-${targetMessageId}`);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                    setHighlightedMsgId(targetMessageId);
                    setTimeout(() => {
                        setHighlightedMsgId(null);
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.delete('messageId');
                        navigate(currentUrl.pathname + currentUrl.search, { replace: true });
                    }, 3000);
                }
            }, 100);
        }
    }, [messages, targetMessageId, navigate]);


    const showBlockedSystemMessage = () => {
        setIsBlocked(true);
        setMessages([
            {
                id: 'blocked-' + Date.now(),
                senderId: 0,
                senderName: 'СИСТЕМА',
                content: '⛔ Ваш акаунт заблоковано. Ви не можете користуватись чатом.',
                timestamp: new Date().toISOString(),
                isSystem: true
            }
        ]);
    };

    const connection = useChatConnection((conn) => {
        conn.on('ReceiveMessage', (senderId, senderName, message, receiverId, timestamp, id, replyToMessageId, replyToSender, replyToContent) => {
            const currentActiveChat = activeChatRef.current;

            const isGeneralMessage = receiverId === null;
            const isCurrentChatOpen = (currentActiveChat === null && isGeneralMessage) ||
                (String(currentActiveChat) === String(senderId)) ||
                (String(currentActiveChat) === String(receiverId));

            if (isCurrentChatOpen) {
                setMessages(prev => {
                    const messageExists = prev.some(m => m.id === id);
                    if (messageExists) return prev;

                    return [...prev, {
                        id, senderId, senderName, content: message, receiverId, timestamp,
                        replyTo: replyToMessageId ? { id: replyToMessageId, senderName: replyToSender, content: replyToContent } : null
                    }];
                });
            }

            if (isGeneralMessage) {
                setGeneralChat(prev => ({
                    lastMessage: `${senderName}: ${message}`,
                    lastMessageTime: timestamp,
                    unreadCount: currentActiveChat !== null ? prev.unreadCount + 1 : 0
                }));
            } else {
                setFriends(prev => {
                    const updatedFriends = prev.map(f => {
                        if (String(f.id) === String(senderId) || String(f.id) === String(receiverId)) {
                            const isIncoming = String(f.id) === String(senderId);
                            const isChatClosed = String(currentActiveChat) !== String(senderId) && String(currentActiveChat) !== String(receiverId);

                            return {
                                ...f,
                                lastMessage: message,
                                lastMessageTime: timestamp,
                                unreadCount: (isIncoming && isChatClosed) ? (f.unreadCount || 0) + 1 : f.unreadCount
                            };
                        }
                        return f;
                    });
                    return updatedFriends.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
                });
            }
        });

        conn.on('MessageEdited', (id, newContent) => {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent, isEdited: true } : m));
        });

        conn.on('MessageDeleted', (id) => {
            setMessages(prev => prev.filter(m => m.id !== id));
            setPinsTrigger(prev => prev + 1);
        });

        conn.on('MessageDeletedForMe', (id) => {
            setMessages(prev => prev.filter(m => m.id !== id));
            setPinsTrigger(prev => prev + 1);
        });
        conn.on('UserStatusChanged', (userId, isOnline, lastActive) => {
            setFriends(prev => prev.map(f => String(f.id) === String(userId) ? { ...f, isOnline, lastActive } : f));
        });

        conn.on('ReactionAdded', (messageId, reactionUserId, userName, emoji) => {
            setReactionsTrigger(prev => ({ ...prev, [messageId]: Date.now() }));
        });

        conn.on('UserTyping', (typingUserId, userName, chatId) => {
            if (String(typingUserId) === String(user?.id)) return;

            setTypingUsers(prev => {
                const exists = prev.find(u => u.userId === typingUserId && u.chatId === chatId);
                if (exists) return prev;
                return [...prev, { userId: typingUserId, userName, chatId }];
            });
        });

        conn.on('UserStoppedTyping', (typingUserId, chatId) => {
            setTypingUsers(prev => prev.filter(u => !(u.userId === typingUserId && u.chatId === chatId)));
        });

        conn.on('ReplyAdded', (parentMessageId) => {
            setRepliesTrigger(prev => ({ ...prev, [parentMessageId]: Date.now() }));
        });

        if (conn.state === HubConnectionState.Connected) {
            conn.invoke("GetFriendsStatus").catch(console.error);
        }
    });

    useEffect(() => {
        setMessages([]);
        setEditingId(null);
        setMessageInput('');

        if (activeChat === null) {
            setGeneralChat(prev => ({ ...prev, unreadCount: 0 }));
            chatAPI.markGeneralAsRead().catch(console.error);

            chatAPI.getGeneralHistory()
                .then(res => setMessages(res.data))
                .catch(err => {
                    if (err.response?.status === 403) showBlockedSystemMessage();
                    else console.error(err);
                });
        } else {
            setFriends(prev => prev.map(f => f.id === activeChat ? { ...f, unreadCount: 0 } : f));
            chatAPI.markAsRead(activeChat).catch(console.error);

            chatAPI.getPrivateHistory(activeChat)
                .then(res => setMessages(res.data))
                .catch(err => {
                    if (err.response?.status === 403) showBlockedSystemMessage();
                    else console.error(err);
                });
        }
    }, [activeChat]);

    useEffect(() => {
        const loadPins = async () => {
            try {
                console.log(`Завантажую закріплені повідомлення для чату: ${activeChat === null ? 'Загальний' : activeChat}`);
                const res = activeChat === null
                    ? await chatAPI.getGeneralPins()
                    : await chatAPI.getPrivatePins(activeChat);
                console.log(`Завантажено ${res.data.length} закріплених повідомлень:`, res.data);
                setPinnedMessages(res.data);
            } catch (err) {
                console.error("Помилка завантаження закріплених:", err);
            }
        };

        loadPins();
    }, [activeChat, pinsTrigger]);

    useEffect(() => {
        if (!targetMessageId) {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleMessageInputChange = (e) => {
        setMessageInput(e.target.value);

        if (connection && connection.state === HubConnectionState.Connected) {
            connection.invoke('UserTyping', activeChat).catch(console.error);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                if (connection && connection.state === HubConnectionState.Connected) {
                    connection.invoke('UserStoppedTyping', activeChat).catch(console.error);
                }
            }, 2000);
        }
    };

    const handleSendOrSave = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !connection) return;
        const originalMessage = messageInput;

        try {
            if (editingId) {
                await connection.invoke('EditMessage', editingId, messageInput);
                setEditingId(null);
                setMessageInput('');
            } else {
                const now = new Date().toISOString();
                if (activeChat !== null) {
                } else {
                    setGeneralChat(prev => ({ ...prev, lastMessage: `Ви: ${messageInput}`, lastMessageTime: now }));
                }
                setMessageInput('');
                await connection.invoke('SendMessage', messageInput, activeChat, replyingTo ? replyingTo.id : null);
                setReplyingTo(null);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                await connection.invoke('UserStoppedTyping', activeChat);
            }
        } catch (err) {
            console.error("Помилка відправки:", err);
            if (err.toString().includes("BLOCK_ERROR") || err.toString().includes("заблоковано")) {
                const errorMessage = {
                    id: 'error-' + Date.now(),
                    senderId: 0,
                    senderName: "СИСТЕМА",
                    content: "⛔ ВАШ АКАУНТ ЗАБЛОКОВАНО. Ви не можете надсилати повідомлення.",
                    timestamp: new Date().toISOString(),
                    isSystem: true
                };
                setMessages(prev => [...prev, errorMessage]);
                setMessageInput(originalMessage);
            } else {
                alert("Помилка з'єднання: " + err.message);
            }
        }
    };

    const handleContextMenu = (e, msg) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, message: msg }); };
    const openReportModal = (msg) => { setTargetMessage(msg); setReportReason(''); setShowReportModal(true); };

    const submitReport = async () => {
        if (!reportReason || !targetMessage) return;
        try {
            await fetch(`${getApiBaseUrl()}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ reportedUserId: String(targetMessage.senderId), messageId: targetMessage.id, content: targetMessage.content, reason: reportReason })
            });
            alert("Скаргу надіслано"); setShowReportModal(false);
        } catch (e) { console.error(e); }
    };

    const startEditing = (msg) => { setEditingId(msg.id); setMessageInput(msg.content); };
    const cancelEditing = () => { setEditingId(null); setMessageInput(''); };
    const deleteForEveryone = async (id) => { if (window.confirm("Видалити для всіх?")) await connection.invoke('DeleteMessageForEveryone', id); };
    const deleteForMe = async (id) => { await connection.invoke('DeleteMessageForMe', id); };
    const filteredMessages = messages;

    const generalTypers = typingUsers.filter(u => u.chatId === null).map(u => u.userName);
    const generalTypingText = generalTypers.length > 0
        ? (generalTypers.length === 1 ? `${generalTypers[0]} друкує...` : `${generalTypers.join(', ')} друкують...`)
        : null;

    return (
        <Container className="mt-4 mb-5" style={{ height: 'calc(100vh - 100px)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <style>{`
          .highlighted-message {
              box-shadow: 0 0 15px 5px rgba(220, 53, 69, 0.6) !important;
              transform: scale(1.02);
              transition: all 0.5s ease-in-out;
              z-index: 10;
          }
          .message-transition {
              transition: all 0.5s ease-in-out;
          }
      `}</style>

            <Row className="h-100">
                <Col md={4} className="h-100 d-flex flex-column">
                    <ListGroup
                        className="flex-grow-1 overflow-auto shadow-sm p-2"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-color)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <ListGroup.Item
                            action
                            active={activeChat === null}
                            onClick={() => setActiveChat(null)}
                            className="p-3 mb-1 shadow-sm"
                            style={{
                                border: 'none',
                                borderRadius: '12px',
                                backgroundColor: activeChat === null ? 'var(--primary-color)' : 'transparent',
                                color: activeChat === null ? 'var(--btn-text)' : 'var(--text-main)',
                                cursor: 'pointer'
                            }}
                        >
                            <div className="d-flex w-100 justify-content-between align-items-center">
                                <div className="d-flex align-items-center overflow-hidden" style={{ flex: 1 }}>
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                                        style={{
                                            width: 45,
                                            height: 45,
                                            backgroundColor: activeChat === null ? 'rgba(255,255,255,0.2)' : 'var(--border-color)',
                                            color: activeChat === null ? 'var(--btn-text)' : 'var(--text-main)'
                                        }}
                                    >#</div>

                                    <div className="ms-3 overflow-hidden d-flex flex-column justify-content-center">
                                        <span className="fw-bold">🌍 Загальний чат</span>
                                        {generalTypingText ? (
                                            <span
                                                className="text-truncate small fst-italic fw-bold"
                                                style={{
                                                    fontSize: '0.85rem',
                                                    color: activeChat === null ? 'var(--btn-text)' : 'var(--primary-color)'
                                                }}
                                            >
                                                ✏️ {generalTypingText}
                                            </span>
                                        ) : (
                                            <span
                                                className="text-truncate small"
                                                style={{
                                                    fontSize: '0.85rem',
                                                    opacity: 0.8,
                                                    color: activeChat === null ? 'var(--btn-text)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {generalChat.lastMessage || <em style={{ opacity: 0.6 }}>Спілкуйтеся тут</em>}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="ms-2 d-flex flex-column align-items-end" style={{ minWidth: '50px' }}>
                                    <span
                                        className="small mb-1"
                                        style={{
                                            fontSize: '0.75rem',
                                            color: activeChat === null ? 'var(--btn-text)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {formatMessageDate(generalChat.lastMessageTime)}
                                    </span>
                                    {generalChat.unreadCount > 0 && (
                                        <Badge bg="danger" pill style={{ fontSize: '0.75em' }}>
                                            {generalChat.unreadCount}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </ListGroup.Item>

                        {friends.length > 0 && (
                            <div className="small mt-3 mb-2 px-3 fw-bold" style={{ color: 'var(--text-secondary)' }}>
                                ДРУЗІ
                            </div>
                        )}

                        {friends.map(friend => {
                            const isOnline = friend.isOnline === true;
                            const isActive = activeChat === friend.id;
                            const borderColor = isOnline ? '#28a745' : 'transparent';
                            const isFriendTyping = typingUsers.some(u => u.chatId === friend.id);

                            return (
                                <ListGroup.Item
                                    key={friend.id}
                                    action
                                    active={isActive}
                                    onClick={() => setActiveChat(friend.id)}
                                    className="p-3 mb-1 shadow-sm"
                                    style={{
                                        border: 'none',
                                        borderRadius: '12px',
                                        backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                                        color: isActive ? 'var(--btn-text)' : 'var(--text-main)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <div className="d-flex align-items-center overflow-hidden" style={{ flex: 1 }}>
                                            <div className="position-relative flex-shrink-0">
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                                    style={{
                                                        width: 45, height: 45,
                                                        border: `2px solid ${borderColor}`,
                                                        overflow: 'hidden',
                                                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--border-color)',
                                                        color: isActive ? 'var(--btn-text)' : 'var(--text-main)'
                                                    }}
                                                >
                                                    {friend.avatarUrl ? (
                                                        <img src={`${getApiBaseUrl()}${friend.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (friend.username[0].toUpperCase())}
                                                </div>
                                            </div>
                                            <div className="ms-3 overflow-hidden d-flex flex-column justify-content-center">
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <span className="fw-bold text-truncate" style={{ fontSize: '0.95rem' }}>{friend.username}</span>
                                                    <UserTitleBadge
                                                        role={friend.role}
                                                        selectedAward={friend.selectedAward}
                                                    />
                                                </div>

                                                {isFriendTyping ? (
                                                    <span
                                                        className="text-truncate small fst-italic fw-bold"
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            color: isActive ? 'var(--btn-text)' : 'var(--primary-color)'
                                                        }}
                                                    >
                                                        ✏️ друкує...
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="text-truncate small"
                                                        style={{
                                                            fontSize: '0.8rem', opacity: 0.8,
                                                            color: isActive ? 'var(--btn-text)' : 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        {friend.lastMessage || <em style={{ opacity: 0.6 }}>Немає повідомлень</em>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ms-2 d-flex flex-column align-items-end" style={{ minWidth: '50px' }}>
                                            <span
                                                className="small mb-1"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: isActive ? 'var(--btn-text)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {formatMessageDate(friend.lastMessageTime)}
                                            </span>
                                            {friend.unreadCount > 0 && (
                                                <Badge bg="danger" pill style={{ fontSize: '0.75em' }}>
                                                    {friend.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </Col>

                <Col md={8} className="h-100">
                    <Card className="h-100 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
                        <Card.Header className="fw-bold py-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                            <span>
                                {activeChat === null ? '🌍 Загальний чат' : friends.find(f => f.id === activeChat)?.username || '💬 Чат'}
                            </span>
                            {activeChat !== null && friends.find(f => f.id === activeChat) && (
                                <UserTitleBadge
                                    role={friends.find(f => f.id === activeChat)?.role}
                                    selectedAward={friends.find(f => f.id === activeChat)?.selectedAward}
                                />
                            )}
                            {isGlobalChat && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {canManagePinsInGlobal ? '🔒 Керування адміна' : '📖 Публічний чат'}
                                </span>
                            )}
                        </Card.Header>

                        {latestPin && (
                            <div
                                className="px-3 py-2 shadow-sm d-flex justify-content-between align-items-center"
                                style={{
                                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                    borderBottom: '1px solid var(--border-color)',
                                    zIndex: 5
                                }}
                            >
                                <div
                                    className="d-flex align-items-center gap-2 overflow-hidden px-1"
                                    style={{ cursor: 'pointer', flex: 1, transition: 'opacity 0.2s' }}
                                    onClick={() => scrollToPinnedMessage(latestPin.messageId)}
                                    title="Перейти до повідомлення"
                                >
                                    <span style={{ color: '#ffd700', fontSize: '1.1rem' }}>📌</span>
                                    <span className="fw-bold text-truncate" style={{ color: 'var(--text-main)', maxWidth: '120px' }}>
                                        {latestPin.senderName}:
                                    </span>
                                    <span className="text-truncate" style={{ color: 'var(--text-secondary)' }}>
                                        {latestPin.messageContent}
                                    </span>
                                </div>

                                <div className="d-flex align-items-center gap-3 ms-3 flex-shrink-0">
                                    {sortedPins.length > 1 && (
                                        <span
                                            style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '600' }}
                                            onClick={() => setShowPinnedModal(true)}
                                            className="text-decoration-underline"
                                        >
                                            Всі ({sortedPins.length})
                                        </span>
                                    )}
                                    {(latestPin.pinnedByName === user?.username || user?.role === 'Admin') && (
                                        <span
                                            style={{ cursor: 'pointer', fontSize: '1.1rem', color: '#dc3545', opacity: 0.8 }}
                                            onClick={(e) => handleUnpin(latestPin.messageId, latestPin.isPinForSelf, e)}
                                            title="Відкріпити"
                                        >
                                            ✖
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <Card.Body className="d-flex flex-column p-0" style={{ overflow: 'hidden' }}>
                            <div
                                ref={chatContainerRef}
                                className="flex-grow-1 p-4"
                                style={{ backgroundColor: 'var(--bg-main)', overflowY: 'auto' }}
                            >
                                {filteredMessages.map((msg, idx) => {
                                    const myId = String(user?.id || '');
                                    const sender = String(msg.senderId || '');
                                    const isMe = sender === myId;
                                    const isHighlighted = highlightedMsgId && String(highlightedMsgId) === String(msg.id);

                                    const isPinned = pinnedMessages.some(p => p.messageId === msg.id);

                                    if (msg.senderId === 0 || msg.senderName === "СИСТЕМА") {
                                        return (
                                            <div key={idx} id={`msg-${msg.id}`} className="d-flex justify-content-center mb-3">
                                                <Badge bg="danger" className="p-2 text-wrap shadow-sm rounded-3" style={{ maxWidth: '80%' }}>
                                                    {msg.content}
                                                </Badge>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={idx} className={`d-flex mb-4 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <div
                                                id={`msg-${msg.id}`}
                                                className={`shadow-sm position-relative message-transition ${isMe ? 'my-message' : ''} ${isHighlighted ? 'highlighted-message' : ''}`}
                                                onContextMenu={(e) => handleContextMenu(e, msg)}

                                                onDoubleClick={() => {
                                                    if (connection && connection.state === HubConnectionState.Connected) {
                                                        connection.invoke('AddReaction', msg.id, '❤️').catch(console.error);
                                                    }
                                                }}
                                                style={{
                                                    maxWidth: '75%',
                                                    padding: '14px 16px',
                                                    backgroundColor: isMe ? undefined : 'var(--bg-card)',
                                                    color: isMe ? undefined : 'var(--text-main)',
                                                    border: isMe ? 'none' : '2px solid var(--border-color)',
                                                    borderRadius: '1rem',
                                                    borderTopLeftRadius: isMe ? undefined : '0',
                                                }}
                                            >
                                                {!isMe && (
                                                    <div
                                                        className="fw-bold small mb-2"
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: 'var(--primary-color)',
                                                            fontSize: '15px'
                                                        }}
                                                        onClick={() => navigate(`/users/${msg.senderId}`)}
                                                    >
                                                        {msg.senderName}
                                                    </div>
                                                )}

                                                <div style={{ wordBreak: 'break-word', fontSize: '16px', lineHeight: '1.6' }}>
                                                    {msg.replyTo && (
                                                        <div 
                                                            className="message-quote mb-2" 
                                                            style={{ 
                                                                cursor: 'pointer', 
                                                                padding: '6px 10px', 
                                                                backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(33, 150, 243, 0.1)', 
                                                                borderLeft: `4px solid ${isMe ? '#fff' : 'var(--primary-color)'}`,
                                                                borderRadius: '4px'
                                                            }}
                                                            onClick={() => {
                                                                const element = document.getElementById(`msg-${msg.replyTo.id}`);
                                                                if (element) {
                                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    setHighlightedMsgId(msg.replyTo.id);
                                                                    setTimeout(() => setHighlightedMsgId(null), 3000);
                                                                }
                                                            }}
                                                        >
                                                            <div className="fw-bold" style={{ fontSize: '13px', color: isMe ? '#fff' : 'var(--primary-color)' }}>
                                                                {msg.replyTo.senderName}
                                                            </div>
                                                            <div className="text-truncate" style={{ fontSize: '13px', color: isMe ? '#e0e0e0' : 'var(--text-secondary)' }}>
                                                                {msg.replyTo.content}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {msg.content}
                                                    {msg.isEdited && <small className="ms-2" style={{ fontSize: '13px', opacity: 0.7, fontWeight: 'bold' }}>(ред.)</small>}
                                                </div>

                                                <div
                                                    className="text-end mt-2 small"
                                                    style={{
                                                        fontSize: '12px',
                                                        opacity: 0.7,
                                                        color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {isPinned && <span className="me-1" title="Закріплене повідомлення">📌</span>}
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                <div className="mt-2">
                                                    <MessageReactions
                                                        messageId={msg.id}
                                                        userId={user?.id}
                                                        refreshTrigger={reactionsTrigger[msg.id]}
                                                        onReactionAdded={(msgId, emoji) => {
                                                            if (connection && connection.state === HubConnectionState.Connected) {
                                                                connection.invoke('AddReaction', msgId, emoji).catch(console.error);
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <MessageReply
                                                    messageId={msg.id}
                                                    refreshTrigger={repliesTrigger[msg.id]}
                                                    onReplySelect={(replyMsgId, senderName) => {
                                                        setReplyingTo({ id: replyMsgId, name: senderName });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
                                {editingId && <div className="d-flex justify-content-between small text-primary mb-2"><span>✏️ Редагування...</span><span onClick={cancelEditing} style={{ cursor: 'pointer' }}>✖</span></div>}
                                {replyingTo && (
                                    <div className="d-flex justify-content-between align-items-center small mb-2 p-2 rounded" style={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', borderLeft: '3px solid var(--primary-color)' }}>
                                        <div>
                                            <span className="fw-bold" style={{ color: 'var(--primary-color)' }}>↩️ Відповідь для: {replyingTo.name}</span>
                                        </div>
                                        <span onClick={() => setReplyingTo(null)} style={{ cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>✖</span>
                                    </div>
                                )}

                                {(() => {
                                    const currentTypingUsers = typingUsers
                                        .filter(u => u.chatId === activeChat)
                                        .map(u => u.userName);

                                    return <TypingIndicator typingUsers={currentTypingUsers} />;
                                })()}

                                <Form onSubmit={handleSendOrSave} className="d-flex gap-2">
                                    <Form.Control
                                        type="text"
                                        value={messageInput}
                                        onChange={handleMessageInputChange}
                                        autoComplete="off"
                                        disabled={isBlocked}
                                        placeholder={isBlocked ? "⛔ Акаунт заблоковано" : "Напишіть повідомлення..."}
                                        style={{
                                            backgroundColor: 'var(--bg-main)',
                                            color: 'var(--text-main)',
                                            borderColor: 'var(--border-color)',
                                            borderRadius: '20px',
                                            fontSize: '16px',
                                            padding: '12px 20px',
                                            minHeight: '48px'
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        variant={editingId ? "success" : "primary"}
                                        disabled={isBlocked || !connection || connection.state !== HubConnectionState.Connected}
                                        style={{
                                            backgroundColor: 'var(--primary-color)',
                                            borderColor: 'var(--primary-color)',
                                            color: 'var(--btn-text)',
                                            borderRadius: '20px',
                                            paddingLeft: '24px',
                                            paddingRight: '24px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            minHeight: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {editingId ? "Зберегти" : "Надіслати"}
                                    </Button>
                                </Form>
                            </div>
                        </Card.Body>
                    </Card>

                    {contextMenu && (
                        <div style={{
                            position: 'absolute',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            zIndex: 9999,
                            borderRadius: '8px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            minWidth: '150px'
                        }}>
                            {String(contextMenu.message.senderId) !== String(user?.id) && (
                                <div onClick={() => { openReportModal(contextMenu.message); setContextMenu(null); }} className="p-2 text-warning hover-bg" style={{ cursor: 'pointer' }}>⚠️ Поскаржитися</div>
                            )}

                            <div
                                onClick={() => { setReplyingTo({ id: contextMenu.message.id, name: contextMenu.message.senderName }); setContextMenu(null); }}
                                className="p-2 hover-bg"
                                style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}
                            >
                                ↩️ Відповісти
                            </div>

                            {(() => {
                                const isPinned = pinnedMessages.some(p => p.messageId === contextMenu.message.id);
                                const pinnedMsg = pinnedMessages.find(p => p.messageId === contextMenu.message.id);

                                if (isPinned) {
                                    return canUnpinMessage(pinnedMsg?.pinnedByName) ? (
                                        <div
                                            onClick={(e) => { handleUnpin(contextMenu.message.id, pinnedMsg?.isPinForSelf, e); setContextMenu(null); }}
                                            className="p-2 hover-bg"
                                            style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}
                                        >
                                            📌 Відкріпити
                                        </div>
                                    ) : null;
                                } else {
                                    return canPinMessage() ? (
                                        <div
                                            onClick={() => {
                                                handlePinMessageWithType(contextMenu.message);
                                                setContextMenu(null);
                                            }}
                                            className="p-2 hover-bg"
                                            style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}
                                        >
                                            📌 Закріпити
                                        </div>
                                    ) : null;
                                }
                            })()}

                            {(String(contextMenu.message.senderId) === String(user?.id) || user?.role === 'Admin') && (
                                <div onClick={() => { deleteForEveryone(contextMenu.message.id); setContextMenu(null); }} className="p-2 text-danger hover-bg" style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}>🗑️ Видалити для всіх</div>
                            )}
                            {String(contextMenu.message.senderId) === String(user?.id) && (
                                <div onClick={() => { startEditing(contextMenu.message); setContextMenu(null); }} className="p-2 hover-bg" style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}>✏️ Редагувати</div>
                            )}
                            <div onClick={() => { deleteForMe(contextMenu.message.id); setContextMenu(null); }} className="p-2 hover-bg" style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)' }}>❌ Видалити для мене</div>
                        </div>
                    )}

                    <Modal show={showPinnedModal} onHide={() => setShowPinnedModal(false)} centered scrollable>
                        <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                            <Modal.Title style={{ color: '#ffd700', fontSize: '1.25rem', fontWeight: 'bold' }}>
                                📌 Всі закріплені
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', maxHeight: '60vh', overflowY: 'auto' }}>
                            {sortedPins.length === 0 ? (
                                <p className="text-center text-muted my-3">Немає закріплених повідомлень.</p>
                            ) : (
                                sortedPins.map(pin => {
                                    const canUnpinThis = canUnpinMessage(pin.pinnedByName);
                                    return (
                                        <div
                                            key={pin.id}
                                            className="d-flex justify-content-between align-items-start mb-2 p-2 rounded"
                                            style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}
                                        >
                                            <div
                                                style={{ cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                                                onClick={() => {
                                                    setShowPinnedModal(false);
                                                    scrollToPinnedMessage(pin.messageId);
                                                }}
                                            >
                                                <div className="fw-bold small" style={{ color: 'var(--primary-color)' }}>{pin.senderName}</div>
                                                <div className="small text-break" style={{ color: 'var(--text-secondary)' }}>{pin.messageContent}</div>
                                                <div className="mt-1" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                                    Закріпив(ла): {pin.pinnedByName} • {new Date(pin.pinnedAt).toLocaleString('uk-UA')}
                                                    {pin.isPinForSelf && <span style={{ marginLeft: '8px', color: 'var(--primary-color)' }}>(для себе)</span>}
                                                </div>
                                            </div>
                                            {canUnpinThis && (
                                                <Button
                                                    variant="link"
                                                    className="text-danger p-0 ms-2 text-decoration-none small fw-bold flex-shrink-0"
                                                    onClick={() => handleUnpin(pin.messageId, pin.isPinForSelf)}
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    Відкріпити
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </Modal.Body>
                    </Modal>

                    <Modal show={showPinTypeModal} onHide={() => setShowPinTypeModal(false)} centered>
                        <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                            <Modal.Title>📌 Як закріпити повідомлення?</Modal.Title>
                        </Modal.Header>
                        <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                            <p className="mb-4">Виберіть, для кого закріпити це повідомлення:</p>
                            <div className="d-grid gap-2">
                                <Button
                                    variant="outline-primary"
                                    onClick={() => pinMessageForType(false)}
                                    style={{
                                        borderColor: 'var(--primary-color)',
                                        color: 'var(--primary-color)',
                                        padding: '12px',
                                        fontSize: '16px'
                                    }}
                                >
                                    👤 Закріпити для себе
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    onClick={() => pinMessageForType(true)}
                                    style={{
                                        borderColor: 'var(--primary-color)',
                                        color: 'var(--primary-color)',
                                        padding: '12px',
                                        fontSize: '16px'
                                    }}
                                >
                                    👥 Закріпити для всіх
                                </Button>
                            </div>
                        </Modal.Body>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
}

export default ChatPage;