import { CLN01_Stores } from "./CLN01_Stores";

export class IndexedDBConnection {
  private static instance: IndexedDBConnection;
  private db: IDBDatabase | null = null;
  // private dbName: string = `CLN01-SIASIS-${ENTORNO}-`;
  private dbName: string = "AsistenciaSystem";
  // Usamos la variable de entorno para la versión
  private dbVersionString: string =
    process.env.NEXT_PUBLIC_CLN01_VERSION || "1.0.0";
  private version: number;
  private isInitializing: boolean = false;
  private initPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    // Constructor privado para patrón Singleton
    this.version = this.getVersionNumber(this.dbVersionString);
  }

  /**
   * Obtiene la instancia única de conexión a IndexedDB
   */
  public static getInstance(): IndexedDBConnection {
    if (!IndexedDBConnection.instance) {
      IndexedDBConnection.instance = new IndexedDBConnection();
    }
    return IndexedDBConnection.instance;
  }

  /**
   * Inicializa la conexión a la base de datos
   */
  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = new Promise((resolve, reject) => {
      // Al abrir con una versión superior, IndexedDB automáticamente
      // dispara onupgradeneeded y gestiona la migración
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        console.log(`Actualizando base de datos a versión ${this.version}`);
        const db = (event.target as IDBOpenDBRequest).result;

        // Si hay stores existentes que ya no necesitamos, los eliminamos
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          const storeName = db.objectStoreNames[i];
          if (!Object.keys(CLN01_Stores).includes(storeName)) {
            db.deleteObjectStore(storeName);
          }
        }

        this.configureDatabase(db);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitializing = false;
        console.log(
          `Base de datos inicializada correctamente con versión ${this.version}`
        );
        resolve(this.db);
      };

      request.onerror = (event) => {
        this.isInitializing = false;
        this.initPromise = null;
        reject(
          `Error al abrir IndexedDB: ${
            (event.target as IDBOpenDBRequest).error
          }`
        );
      };
    });

    return this.initPromise;
  }

  /**
   * Configura la estructura de la base de datos
   */
  private configureDatabase(db: IDBDatabase): void {
    // Crear los object stores y sus índices
    for (const [storeName, config] of Object.entries(CLN01_Stores)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: config.keyPath,
          autoIncrement: config.autoIncrement,
        });

        // Crear los índices
        for (const index of config.indexes) {
          store.createIndex(index.name, index.keyPath, index.options);
        }
      }
    }
  }

  /**
   * Convierte la versión semántica a un número entero para IndexedDB
   */
  private getVersionNumber(versionString: string): number {
    // Eliminar cualquier sufijo (como -alpha, -beta, etc.)
    const cleanVersion = versionString.split("-")[0];

    // Dividir por puntos y convertir a un número entero
    // Por ejemplo: "1.2.3" -> 1 * 10000 + 2 * 100 + 3 = 10203
    const parts = cleanVersion.split(".");
    let versionNumber = 1; // Valor por defecto

    if (parts.length >= 3) {
      versionNumber =
        parseInt(parts[0]) * 10000 +
        parseInt(parts[1]) * 100 +
        parseInt(parts[2]);
    }

    return versionNumber;
  }

  /**
   * Obtiene la conexión a la base de datos
   */
  public async getConnection(): Promise<IDBDatabase> {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  /**
   * Cierra la conexión a la base de datos
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Obtiene una transacción para un almacén específico
   */
  public async getTransaction(
    storeName: string,
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBTransaction> {
    const db = await this.getConnection();
    return db.transaction(storeName, mode);
  }

  /**
   * Obtiene un object store para realizar operaciones
   */
  public async getStore(
    storeName: string,
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBObjectStore> {
    const transaction = await this.getTransaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Ejecuta una operación en la base de datos
   */
  public async executeOperation<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const store = await this.getStore(storeName, mode);

    return new Promise<T>((resolve, reject) => {
      const request = operation(store);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(`Error en operación: ${(event.target as IDBRequest).error}`);
      };
    });
  }
}

// Exportar la instancia única
export default IndexedDBConnection.getInstance();
