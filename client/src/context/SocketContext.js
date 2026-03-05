import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../util/socket_io'; 

export const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export function SocketProvider  ({ children, user }) {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user && user._id) { 
            const socketInstance = getSocket({
                query: {
                    userId: user._id
                }
            });

            setSocket(socketInstance);

            return () => socketInstance.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
