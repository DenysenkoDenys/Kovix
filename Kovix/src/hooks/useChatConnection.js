import { useEffect, useRef } from 'react';
import { useSignalR } from '../contexts/SignalRContext';

/**
 * useChatConnection - хук для роботи з глобальним SignalR chat з'єднанням
 * @param {(connection: any) => void} onConnectedCallback - колбек для підписки на події або виклику методів після старту
 */
export const useChatConnection = (onConnectedCallback) => {
    const { chatConnection } = useSignalR();
    const callbackRef = useRef(onConnectedCallback);

    useEffect(() => {
        callbackRef.current = onConnectedCallback;
    }, [onConnectedCallback]);

    useEffect(() => {
        if (chatConnection && callbackRef.current) {
            callbackRef.current(chatConnection);
        }
    }, [chatConnection]);

    return chatConnection;
};