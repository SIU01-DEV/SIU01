/**
 * Transforma un timestamp a un formato de hora 12h (por ejemplo: "8:00am", "4:00pm")
 * @param timestamp - String que representa una fecha y hora
 * @param yaEsUTC - Booleano que indica si el timestamp ya está en UTC (default: false)
 * @returns String formateado como "8:00am"
 */
export default function formatearISOaFormato12Horas(
  timestamp: string,
  yaEsUTC: boolean = false
): string {
  try {
    // Crear objeto Date a partir del timestamp
    const fecha = new Date(timestamp);

    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      return "Formato de fecha inválido";
    }

    // Obtener horas y minutos dependiendo si ya es UTC o no
    let horas = yaEsUTC ? fecha.getHours() : fecha.getUTCHours();
    const minutos = yaEsUTC ? fecha.getMinutes() : fecha.getUTCMinutes();

    // Determinar AM o PM
    const periodo = horas >= 12 ? "pm" : "am";

    // Convertir a formato 12 horas
    horas = horas % 12;
    horas = horas ? horas : 12; // Si es 0, mostrar como 12

    // Formatear minutos con ceros a la izquierda si es necesario
    const minutosFormateados = minutos < 10 ? `0${minutos}` : minutos;

    // Construir la cadena de resultado
    return `${horas}:${minutosFormateados}${periodo}`;
  } catch (error) {
    console.log(error);
    // Error al procesar la fecha
    return "##:##";
  }
}