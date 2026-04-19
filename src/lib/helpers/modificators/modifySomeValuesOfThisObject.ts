/**
 * Recorre un objeto profundamente y modifica valores primitivos cuyas
 * llaves coincidan con los patrones proporcionados.
 */
export function modifySomeValuesOfThisObject<T>(
  obj: T,
  matchers: (string | RegExp)[],
  modifier: (value: string | number, key: string) => string | number,
): T {
  // 1. Si no es un objeto o es null, devolvemos el valor tal cual (caso base)
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // 2. Manejo de Arrays: procesamos cada elemento recursivamente
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      modifySomeValuesOfThisObject(item, matchers, modifier),
    ) as any;
  }

  // 3. Para objetos, creamos una copia y procesamos sus propiedades
  const result = { ...obj } as any;

  for (const key in result) {
    const value = result[key];

    // Verificamos si la llave coincide con algún string o RegExp del array
    const isMatch = matchers.some((matcher) =>
      matcher instanceof RegExp ? matcher.test(key) : matcher === key,
    );

    // Verificamos si el valor es un "primitivo objetivo" (string o number)
    const isPrimitive = typeof value === "string" || typeof value === "number";

    if (isMatch && isPrimitive) {
      // Aplicamos el modificador si pasa ambas validaciones
      result[key] = modifier(value as string | number, key);
    } else if (typeof value === "object" && value !== null) {
      // Si es un objeto/array, entramos recursivamente
      result[key] = modifySomeValuesOfThisObject(value, matchers, modifier);
    }
  }

  return result;
}