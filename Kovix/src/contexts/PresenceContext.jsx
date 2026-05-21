import { createContext, useContext, useMemo } from 'react';
import { useSignalR } from './SignalRContext';

const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
    const { chatConnection } = useSignalR();

    const contextValue = useMemo(() => ({
        connection: chatConnection,
        connected: chatConnection?.state === 'Connected'
    }), [chatConnection]);

    return (
        <PresenceContext.Provider value={contextValue}>
            {children}
        </PresenceContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePresence = () => useContext(PresenceContext);