import { modifySomeValuesOfThisObject } from "@/lib/helpers/modificators/modifySomeValuesOfThisObject";
import { IndexedDBConnection } from "../IndexedDBConnection";
import { xorCipher } from "./utils/xorCipher";
import { generateIDBEncriptionKey } from "@/lib/helpers/generators/keys/generateEncriptionKey";

const sensiblePropertiesToEncryptInIDB: (string | RegExp)[] = [
  /^Id_/,
  "Nombres",
  "Apellidos",
  "Identificador_Nacional",
  "Nombre_Usuario",
  "Celular",
  "Correo_Electronico",
  "Contraseña",
  "Codigo",
  "Entradas",
  "Salidas",
  "Asistencias_Mensuales",
  "Contenido",
  /Google_Drive/i,
  "Detalles",
  "Descripcion",
];

const propiedadesSiempreTexto = ["Id_Estudiante", "Id_Auxiliar", "Id_Profesor_Primaria", "Id_Profesor_Secundaria", "Id_Aula", "Id_Personal_Administrativo", "Identificador_Nacional"];

export class EncryptorIDB {
  public static getEncriptionKey(): string {
    const seedKeyEncriptation = IndexedDBConnection.seedKeyEncriptation;
    const idbEncriptionSalt = process.env
      .NEXT_PUBLIC_IDB_ENCRIPTION_SALT as string;

    return generateIDBEncriptionKey(seedKeyEncriptation!, idbEncriptionSalt);
  }

  public static encryptThis<T>(anyValue: T): T {
    const key = EncryptorIDB.getEncriptionKey();

    // Si es un array, encriptamos todos sus elementos "si o si"
    if (Array.isArray(anyValue)) {
      return anyValue.map((item) =>
        EncryptorIDB.encryptThis(item),
      ) as unknown as T;
    }

    // Caso Primitivo: string o number
    if (typeof anyValue === "string" || typeof anyValue === "number") {
      return xorCipher(anyValue.toString(), key) as unknown as T;
    }

    // Caso Objeto: Procesamiento profundo con filtros
    return modifySomeValuesOfThisObject(
      anyValue,
      sensiblePropertiesToEncryptInIDB,
      (value: string | number) => xorCipher(value.toString(), key),
    );
  }

  public static decryptThis<T>(anyValue: T): T {
    const key = EncryptorIDB.getEncriptionKey();

    // Si es un array, desencriptamos todos sus elementos "si o si"
    if (Array.isArray(anyValue)) {
      return anyValue.map((item) =>
        EncryptorIDB.decryptThis(item),
      ) as unknown as T;
    }

    // Caso Primitivo: string o number
    if (typeof anyValue === "string" || typeof anyValue === "number") {
      const decryptValue = xorCipher(anyValue.toString(), key);

      const numberDecryptValue = Number(decryptValue);

      return (isNaN(numberDecryptValue) ||
      // En caso la longitud no coincida al transformar a número, devolvemos el string original
      numberDecryptValue.toString().length !== decryptValue.length ||
      decryptValue.trim() === ""
        ? decryptValue
        : numberDecryptValue) as unknown as T;
    }

    // Caso Objeto: Procesamiento profundo con filtros
    return modifySomeValuesOfThisObject(
      anyValue,
      sensiblePropertiesToEncryptInIDB,
      (value: string | number, propertyKey: string) => {
        const decryptValue = xorCipher(value.toString(), key);
        if (propiedadesSiempreTexto.includes(propertyKey)) {
          return decryptValue;
        }

        const numberDecryptValue = Number(decryptValue);

        return isNaN(numberDecryptValue) || decryptValue.trim() === ""
          ? decryptValue
          : numberDecryptValue;
      },
    );
  }
}