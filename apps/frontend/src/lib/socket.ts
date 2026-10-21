// Singleton lazy de socket.io-client (gateway realtime del backend).
// Consumo típico:
//   const socket = getSocket();
//   socket.on(EVENTS.comandaNueva, (e: ComandaNuevaEvent) => { ... });
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import { getAccessToken } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  socket ??= io(API_URL, {
    // Token fresco en cada (re)conexión; el gateway hoy no valida auth,
    // pero queda listo para cuando lo haga.
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
