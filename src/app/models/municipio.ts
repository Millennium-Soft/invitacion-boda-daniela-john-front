import { Departamento } from './departamento';
export class Municipio {
  codigo!: number;
  nombre!: string;
  divipola!: string;
  tipo!: string;
  area!: string;
  departamento!: Departamento;
}
