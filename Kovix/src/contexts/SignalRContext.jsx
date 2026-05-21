import { createContext, useContext, useEffect, useState } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { getWebSocketUrl } from '../utils/apiConfig';

const SignalRContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSignalR = () => {
    const context = useContext(SignalRContext);
    if (!context) {
        console.warn('useSignalR must be used within SignalRProvider');
    }
    return context;
};

export const SignalRProvider = ({ children }) => {
    const [notificationConnection, setNotificationConnection] = useState(null);
    const [chatConnection, setChatConnection] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found. SignalR connections skipped.');
            return;
        }

        const wsUrl = getWebSocketUrl();

        const notifConn = new HubConnectionBuilder()
            .withUrl(`${wsUrl}/notificationHub`, {
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .withAutomaticReconnect()
            .build();

        const chatConn = new HubConnectionBuilder()
            .withUrl(`${wsUrl}/chatHub`, {
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .withAutomaticReconnect()
            .build();

        const isExpectedAbort = (err) => {
            const message = String(err?.message || err || '');
            return err?.name === 'AbortError'
                || message.includes('negotiation')
                || message.includes('stopped')
                || message.includes('canceled')
                || message.includes('cancelled');
        };

        const startConnections = async () => {
            const results = await Promise.allSettled([
                notifConn.start(),
                chatConn.start()
            ]);

            if (cancelled) {
                return;
            }

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(index === 0
                        ? '✅ SignalR notifications connected'
                        : '✅ SignalR chat connected');
                    return;
                }

                if (!isExpectedAbort(result.reason)) {
                    console.error('SignalR connection error:', result.reason);
                }
            });

            setNotificationConnection(notifConn);
            setChatConnection(chatConn);
        };

        startConnections();

        return () => {
            cancelled = true;
            notifConn.stop().catch(() => {});
            chatConn.stop().catch(() => {});
        };
    }, []);

    const value = {
        notificationConnection,
        chatConnection,
        connection: notificationConnection
    };

    return (
        <SignalRContext.Provider value={value}>
            {children}
        </SignalRContext.Provider>
    );
};