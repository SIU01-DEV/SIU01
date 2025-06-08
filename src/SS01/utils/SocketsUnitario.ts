import { Socket } from "socket.io";

export class SocketEmitter<T> {
  constructor(
    private socketConnection: Socket | SocketIOClient.Socket,
    private nombreEvento: string,
    private data?: T
  ) {}

  execute(): boolean {
    try {
      // Verificar que la conexión existe y está conectada
      if (!this.socketConnection) {
        console.error(
          `❌ [SocketEmitter] No hay conexión disponible para evento: ${this.nombreEvento}`
        );
        return false;
      }

      if (!this.socketConnection.connected) {
        console.error(
          `❌ [SocketEmitter] Socket no conectado para evento: ${this.nombreEvento}`
        );
        return false;
      }

      // Si hay data, enviarla; si no, enviar evento sin payload
      if (this.data !== undefined) {
        // No serializar a JSON aquí, dejarlo como objeto
        this.socketConnection.emit(this.nombreEvento, this.data);
        console.log(
          `📤 [SocketEmitter] Evento enviado: ${this.nombreEvento}`,
          this.data
        );
      } else {
        this.socketConnection.emit(this.nombreEvento);
        console.log(
          `📤 [SocketEmitter] Evento enviado: ${this.nombreEvento} (sin payload)`
        );
      }

      return true;
    } catch (error) {
      console.error(
        `❌ [SocketEmitter] Error al enviar evento ${this.nombreEvento}:`,
        error
      );
      return false;
    }
  }
}

export class SocketHandler<T> {
  private listenerAttached: boolean = false;
  private _wrappedCallback?: (data: T) => void;

  constructor(
    private socketConnection: Socket | SocketIOClient.Socket,
    private nombreEvento: string,
    private callback: (data: T) => void
  ) {}

  hand(): boolean {
    try {
      // Verificar que la conexión existe
      if (!this.socketConnection) {
        console.error(
          `❌ [SocketHandler] No hay conexión disponible para evento: ${this.nombreEvento}`
        );
        return false;
      }

      // Evitar listeners duplicados
      if (this.listenerAttached) {
        console.warn(
          `⚠️ [SocketHandler] Listener ya está registrado para: ${this.nombreEvento}`
        );
        return true;
      }
      // Wrapper para logging y error handling
      this._wrappedCallback = (data: T) => {
        try {
          console.log(
            `📥 [SocketHandler] Evento recibido: ${this.nombreEvento}`,
            data
          );
          this.callback(data);
        } catch (error) {
          console.error(
            `❌ [SocketHandler] Error en callback para ${this.nombreEvento}:`,
            error
          );
        }
      };

      this.socketConnection.on(this.nombreEvento, this._wrappedCallback);
      this.listenerAttached = true;
      console.log(
        `✅ [SocketHandler] Listener registrado para: ${this.nombreEvento}`
      );

      return true;
    } catch (error) {
      console.error(
        `❌ [SocketHandler] Error al registrar listener para ${this.nombreEvento}:`,
        error
      );
      return false;
    }
  }

  // Método para remover el listener
  unhand(): boolean {
    try {
      if (!this.socketConnection || !this.listenerAttached) {
        return false;
      }
      if (this._wrappedCallback) {
        this.socketConnection.off(this.nombreEvento, this._wrappedCallback);
        this._wrappedCallback = undefined;
      }
      this.listenerAttached = false;
      console.log(
        `🗑️ [SocketHandler] Listener removido para: ${this.nombreEvento}`
      );

      return true;
    } catch (error) {
      console.error(
        `❌ [SocketHandler] Error al remover listener para ${this.nombreEvento}:`,
        error
      );
      return false;
    }
  }

  // Getter para verificar si el listener está activo
  get isListening(): boolean {
    return this.listenerAttached;
  }
}
