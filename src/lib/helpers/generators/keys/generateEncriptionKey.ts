export function generateIDBEncriptionKey(
  masterSeed: string,
  saltOrContext: string
): string {
  const inputCombinado = `${masterSeed}|${saltOrContext}`;

  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0, ch; i < inputCombinado.length; i++) {
    ch = inputCombinado.charCodeAt(i);
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

  return hashNumerico.toString(36).padEnd(15, "0").substring(0, 15);
}
