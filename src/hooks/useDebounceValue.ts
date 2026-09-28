import { useEffect, useState } from "react";

/**
 * Devuelve una versión "debounced" del valor: solo se actualiza
 * después de que pase `delayMs` sin que el valor original cambie.
 */
export function useDebouncedValue<T>(valor: T, delayMs: number = 400): T {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setValorDebounced(valor);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [valor, delayMs]);

  return valorDebounced;
}

export default useDebouncedValue;