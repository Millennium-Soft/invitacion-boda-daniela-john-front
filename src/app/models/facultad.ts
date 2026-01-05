import { Sede } from "./sede";

export class Facultad {
  codigo!: number;
  sede!: Sede;
  nombre!: string;
  decano!: string;
  correo!: string;
  telefono!: string;
  fechaCreacion!: Date;
  estado!: number;
}
