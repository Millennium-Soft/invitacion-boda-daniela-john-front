import { CuerposColegiados } from './cuerpos-colegiados';
import { MiembroTipo } from './miembro-tipo';
import { UsuarioTipo } from './usuario-tipo';

export class IntegranteCuerpoColegiado {
  codigo!: number;
  cuerpoColegiado!: CuerposColegiados;
  nombreCuerpoColegiado!: string;
  personaCodigo!: number;
  personaIdentificacion!: string;
  personaNombre!: string;
  personaApellido!: string;
  codigoNorma!: number;
  usuarioTipo!: UsuarioTipo;
  miembroTipo!: MiembroTipo;
  fechaInicio!: Date;
  fechaFin!: Date;
  observacion!: string;
  estado!: number;
}
