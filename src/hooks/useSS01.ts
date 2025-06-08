/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entornos_BasePaths_SS01 } from "@/Assets/ss01/Entornos";
import { ENTORNO } from "@/constants/ENTORNO";
import {
  setGlobalSocket,
  clearGlobalSocket,
  setConnectionStatus,
  setConnectionError,
} from "@/global/state/others/globalSocket";
import { AppDispatch, RootState } from "@/global/store";
import userStorage from "@/lib/utils/local/db/models/UserStorage";
import { TomaAsistenciaPersonalSIU01Events } from "@/SS01/sockets/events/AsistenciaDePersonal/frontend/TomaAsistenciaPersonalSIU01Events";
import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import io, { Socket } from "socket.io-client";

export const useSS01 = (
) => {
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Usar ref para evitar recrear conexiones innecesarias
  const socketRef = useRef<typeof Socket | null>(null);
  const connectionAttemptRef = useRef<boolean>(false);

  const globalSocket = useSelector(
    (state: RootState) => state.others.globalSocket.socket
  );

  const isConnected = useSelector(
    (state: RootState) => state.others.globalSocket.isConnected
  );

  const dispatch = useDispatch<AppDispatch>();

  // Obtener token al inicializar
  const getToken = useCallback(async () => {
    try {
      const currentToken = await userStorage.getAuthToken();
      setToken(currentToken);
    } catch (error) {
      console.error("Error al obtener token:", error);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      getToken();
      setIsInitialized(true);
    }
  }, [getToken, isInitialized]);

  // Crear conexión Socket.IO
  const createSocketConnection = useCallback(() => {
    if (!token || connectionAttemptRef.current || globalSocket) {
      return;
    }

    connectionAttemptRef.current = true;
    console.log("🚀 [useSS01] Creando nueva conexión Socket.IO");

    try {
      const socketConnection = io(process.env.NEXT_PUBLIC_SS01_URL_BASE!, {
        path: Entornos_BasePaths_SS01[ENTORNO],
        auth: { token },
        transports: ["websocket", "polling"],
        autoConnect: true,
        forceNew: true,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Configurar event listeners
      socketConnection.on("connect", () => {
        console.log("✅ [useSS01] Conectado al servidor SS01");
        dispatch(setConnectionStatus({ value: true }));
        TomaAsistenciaPersonalSIU01Events.socketConnection=socketConnection
      });

      socketConnection.on("disconnect", (reason: any) => {
        console.log("❌ [useSS01] Desconectado del servidor SS01:", reason);
        dispatch(setConnectionStatus({ value: false }));
      });

      socketConnection.on("connect_error", (error: any) => {
        console.error("💥 [useSS01] Error de conexión:", error);
        dispatch(setConnectionError({ value: error.message }));
        connectionAttemptRef.current = false; // Permitir reintentos
      });

      socketConnection.on("reconnect", (attemptNumber: any) => {
        console.log(
          "🔄 [useSS01] Reconectado al servidor SS01. Intento:",
          attemptNumber
        );
        dispatch(setConnectionStatus({ value: true }));
        dispatch(setConnectionError({ value: null }));
      });

      // Guardar referencia y en Redux
      socketRef.current = socketConnection;
      dispatch(setGlobalSocket({ value: socketConnection }));
    } catch (error) {
      console.error("❌ [useSS01] Error al crear conexión:", error);
      connectionAttemptRef.current = false;
    }
  }, [token, globalSocket, dispatch]);

  // Limpiar conexión
  const cleanupConnection = useCallback(() => {
    if (socketRef.current) {
      console.log("🧹 [useSS01] Limpiando conexión Socket.IO");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    dispatch(clearGlobalSocket());
    connectionAttemptRef.current = false;
  }, [dispatch]);

  // Crear conexión cuando tengamos token
  useEffect(() => {
    if (token && !globalSocket && !connectionAttemptRef.current) {
      createSocketConnection();
    }
  }, [token, globalSocket, createSocketConnection]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

  // Funciones helper
  const disconnect = useCallback(() => {
    cleanupConnection();
  }, [cleanupConnection]);

  const reconnect = useCallback(() => {
    cleanupConnection();
    // Pequeño delay para asegurar limpieza completa
    setTimeout(() => {
      createSocketConnection();
    }, 100);
  }, [cleanupConnection, createSocketConnection]);

  return {
    globalSocket,
    isConnected,
    token: !!token,
    disconnect,
    reconnect,
  };
};
