type DateTimeDelta = {
  dias?: number;
  horas?: number;
  minutos?: number;
  segundos?: number;
};

export default function addToDate(fecha: Date, delta: DateTimeDelta): Date {
  const resultado = new Date(fecha.getTime());

  if (delta.dias !== undefined) {
    resultado.setDate(resultado.getDate() + delta.dias);
  }

  if (delta.horas !== undefined) {
    resultado.setHours(resultado.getHours() + delta.horas);
  }

  if (delta.minutos !== undefined) {
    resultado.setMinutes(resultado.getMinutes() + delta.minutos);
  }

  if (delta.segundos !== undefined) {
    resultado.setSeconds(resultado.getSeconds() + delta.segundos);
  }

  return resultado;
}
