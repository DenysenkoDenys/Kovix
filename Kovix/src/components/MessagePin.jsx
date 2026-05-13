import { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { Badge, Button } from 'react-bootstrap';
import '../style/MessagePin.css';

export default function MessagePin({ messageId, messageContent, senderName, isPinned, onPinToggle }) {
    const [pinned, setPinned] = useState(isPinned || false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPinned(isPinned);
    }, [isPinned]);

    const handlePinToggle = async () => {
        setLoading(true);
        try {
            await chatAPI.pinMessage(messageId);
            setPinned(!pinned);
            if (onPinToggle) {
                onPinToggle(messageId, !pinned);
            }
        } catch (err) {
            console.error('Помилка при закріпленні:', err);
        } finally {
            setLoading(false);
        }
    };
}