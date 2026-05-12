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

        Promise.all([
            notifConn.start().then(() => console.log('✅ SignalR notifications connected')),
            chatConn.start().then(() => console.log('✅ SignalR chat connected'))
        ]).catch(err => {
            console.error('SignalR connection error:', err);
        });

        setNotificationConnection(notifConn);
        setChatConnection(chatConn);

        return () => {
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