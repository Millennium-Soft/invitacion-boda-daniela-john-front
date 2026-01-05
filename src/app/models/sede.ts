import { CabecerasCentrosPoblados } from "./cabeceras-centros-poblados";
import { Municipio } from "./municipio";
import { Departamento } from "./departamento";
import { Pais } from "./pais";
import { SedeTipo } from "./sede-tipo";

export class Sede {
  codigo!: number;
  nit!: string;
	nombre!: string;
	pais!: Pais;
	departamento!: Departamento;
	municipio!: Municipio;
  ccp!: CabecerasCentrosPoblados
	direccion!: string;
	telefono!: string;
	sedeTipo!: SedeTipo;
	fechaCreacion!: Date;
	estado!: number;
}
