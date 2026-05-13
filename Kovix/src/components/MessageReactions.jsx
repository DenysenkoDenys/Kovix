import { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import '../style/MessageReactions.css';

const AVAILABLE_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '✨', '🎉'];

export default function MessageReactions({ messageId, userId, onReactionAdded, refreshTrigger }) {
    const [reactions, setReactions] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [userReactions, setUserReactions] = useState(new Set());

    useEffect(() => {
        if (userId) {
            loadReactions();
        }
    }, [messageId, userId, refreshTrigger]);

    const loadReactions = async () => {
        try {
            const res = await chatAPI.getReactions(messageId);
            setReactions(res.data);
            
            const myReactions = new Set();
            res.data.forEach(r => {
                if (String(r.userId) === String(userId)) {
                    myReactions.add(r.reactionEmoji);
                }
            });
            setUserReactions(myReactions);
        } catch (err) {
            console.error('Помилка завантаження реакцій:', err);
        }
    };

    const handleReactionClick = (emoji) => {
        setShowEmojiPicker(false);
        if (onReactionAdded) {
            onReactionAdded(messageId, emoji);
        }
    };

    const groupedReactions = reactions.reduce((acc, r) => {
        const existing = acc.find(item => item.emoji === r.reactionEmoji);
        if (existing) {
            existing.count++;
            existing.users.push(r.userName);
        } else {
            acc.push({
                emoji: r.reactionEmoji,
                count: 1,
                users: [r.userName]
            });
        }
        return acc;
    }, []);

    return (
        <div className="message-reactions">
            <div className="reactions-container">
                {groupedReactions.map(r => (
                    <div
                        key={r.emoji}
                        className={`reaction-badge ${userReactions.has(r.emoji) ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation(); 
                            handleReactionClick(r.emoji);
                        }}
                        title={r.users.join(', ')}
                    >
                        <span className="reaction-emoji">{r.emoji}</span>
                        <span className="reaction-count">{r.count}</span>
                    </div>
                ))}
            </div>

            <button
                className="add-reaction-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                }}
                title="Додати реакцію"
            >
                +
            </button>

            {showEmojiPicker && (
                <div className="emoji-picker">
                    {AVAILABLE_REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            className="emoji-option"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReactionClick(emoji);
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}