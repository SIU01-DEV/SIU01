/**
 * Procesa una cadena mediante XOR con una llave.
 * Al ser XOR, la misma función sirve para ENCRIPTAR y DECRIPTAR.
 * * @param input Texto a procesar
 * @param key Llave final de 15 caracteres
 * @returns Cadena resultante de la misma longitud
 */
export function xorCipher(input: string, key: string): string {
  let output = "";

  for (let i = 0; i < input.length; i++) {
    // Obtenemos el código del carácter del input
    const charCodeInput = input.charCodeAt(i);

    // Obtenemos el código del carácter de la llave (usamos módulo para ciclarla)
    const charCodeKey = key.charCodeAt(i % key.length);

    // Aplicamos XOR y convertimos de nuevo a carácter
    // El operador ^ es el XOR binario en JavaScript
    output += String.fromCharCode(charCodeInput ^ charCodeKey);
  }

  return output;
}
