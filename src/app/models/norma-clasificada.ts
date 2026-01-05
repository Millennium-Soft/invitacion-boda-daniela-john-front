import { Norma } from './norma';
import { NormaGrupo } from './norma-grupo';
export class NormaClasificada {
  codigo!: number;
  norma!: Norma;
  normaGrupo!: NormaGrupo;
  estado!: number;
}
