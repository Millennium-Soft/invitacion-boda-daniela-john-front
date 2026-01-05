import { CabecerasCentrosPoblados } from "./cabeceras-centros-poblados";
import { CaracterAcademico } from "./caracter-academico";
import { Departamento } from "./departamento";
import { Municipio } from "./municipio";
import { NaturalezaJuridica } from "./naturaleza-juridica";
import { Pais } from "./pais";
import { Sector } from "./sector";

export class Institucion {
  codigo!: number;
  nit!: string;
	ies!: number;
	iesPadre!: number;
	naturaleza!: NaturalezaJuridica;
	sector!: Sector;
	caracter!: CaracterAcademico;
	nombre!: string;
	pais!: Pais;
	departamento!: Departamento;
	municipio!: Municipio;
  ccp!: CabecerasCentrosPoblados
	direccion!: string;
	telefono!: string;
	url!: string;
  normaCodigo!: string;
	norma!: string;
	fechaNorma!: Date;
	estado!: number;
}
