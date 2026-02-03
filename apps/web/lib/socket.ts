import { io, Socket } from "socket.io-client";

// In production, this URL should come from env
const SOCKET_URL = "http://localhost:3001";

class ClientSocketService {
  public socket: Socket | null = null;

  public connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      console.log("[Client] Socket connecting...");

      this.socket.on("connect", () => {
        console.log("[Client] Connected to socket server:", this.socket?.id);
      });

      this.socket.on("disconnect", () => {
        console.log("[Client] Disconnected");
      });
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new ClientSocketService();
