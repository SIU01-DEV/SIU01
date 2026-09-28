/**
 * Genera una cadena determinista de 10 caracteres a partir de un input.
 * @param username El "username" o cadena de origen.
 * @returns Una cadena de 10 caracteres alfanuméricos.
 */
export function generateKeyFromUsername(username: string): string {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0, ch; i < username.length; i++) {
    ch = username.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hashNumerico = 4294967296 * (2097151 & h2) + (h1 >>> 0);

  let resultado = hashNumerico.toString(36).padEnd(10, "0");

  return resultado.substring(0, 10);
}
