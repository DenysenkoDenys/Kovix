import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../utils/apiConfig';

const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
    const { user, token } = useAuth();
    const connectionRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!user || !token) return;

        const wsUrl = getWebSocketUrl();
        const connection = new HubConnectionBuilder()
            .withUrl(`${wsUrl}/chatHub`, { 
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        connectionRef.current = connection;

        connection.start()
            .then(() => {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setConnected(true);
            })
            .catch(err => {
                if (err.toString().includes("negotiation") || err.toString().includes("stopped")) return;
                console.error('SignalR Connection Error:', err);
            });

        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop()
                    .catch(err => console.error("Error stopping connection:", err))
                    .finally(() => {
                        connectionRef.current = null;
                        // eslint-disable-next-line react-hooks/set-state-in-effect
                        setConnected(false);
                    });
            }
        };
    }, [user, token]);

    const contextValue = useMemo(() => ({
        // eslint-disable-next-line react-hooks/rules-of-hooks
        connection: connected ? connectionRef.current : null,
        connected
    }), [connected]);

    return (
        <PresenceContext.Provider value={contextValue}>
            {children}
        </PresenceContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePresence = () => useContext(PresenceContext);