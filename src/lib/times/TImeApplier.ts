import { Hora_Minuto_Segundo } from "@/interfaces/shared/Horarios";

class TimeApplier {
  private readonly hour: number;
  private readonly minute: number;
  private readonly second: number;

  /**
   * @param hour Hora (0-23)
   * @param minute Minuto (0-59) - Defecto: 0
   * @param second Segundo (0-59) - Defecto: 0
   */
  constructor(componentes: Hora_Minuto_Segundo) {
    this.hour = componentes.Hora;
    this.minute = componentes.Minuto;
    this.second = componentes.Segundo;
  }

  /**
   * Suma o resta tiempo y devuelve una nueva instancia de TimeApplier.
   * @param offset El tiempo a sumar o restar
   * @param operation 'add' para sumar, 'sub' para restar
   */
  compute(
    offset: Hora_Minuto_Segundo,
    operation: "add" | "sub"
  ): TimeApplier {
    const factor = operation === "add" ? 1 : -1;

    // Usamos un Date base (cualquiera) para aprovechar el manejo de desbordamiento de JS
    const tempDate = new Date();
    tempDate.setHours(
      this.hour + offset.Hora * factor,
      this.minute + offset.Minuto * factor,
      this.second + offset.Segundo * factor,
      0
    );

    return new TimeApplier({
      Hora: tempDate.getHours(),
      Minuto: tempDate.getMinutes(),
      Segundo: tempDate.getSeconds(),
    });
  }

  add(offset: Hora_Minuto_Segundo): TimeApplier {
    return this.compute(offset, "add");
  }

  subtract(offset: Hora_Minuto_Segundo): TimeApplier {
    return this.compute(offset, "sub");
  }

  // Para poder ver el estado actual si lo necesitas
  getTime(): Hora_Minuto_Segundo {
    return { Hora: this.hour, Minuto: this.minute, Segundo: this.second };
  }

  /**
   * Toma una fecha y le asigna el tiempo definido en el constructor.
   * @param date Objeto Date original
   * @returns Un nuevo objeto Date con el tiempo modificado
   */
  applyTo(date: Date): Date {
    // Creamos una copia para no afectar la fecha original externamente
    const newDate = new Date(date.getTime());

    newDate.setHours(this.hour, this.minute, this.second, 0); // Seteamos ms en 0 por limpieza

    return newDate;
  }
}

export default TimeApplier;
