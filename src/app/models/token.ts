export class Token {
  codigo!: number;
  id!: String;
  token!: String;
  intento!: number;
  estado!: number;
  ip!: String;
  fechaGeneracion!: Date;
  fechaExpiracion!: Date;
  fechaFinSesion!: Date;
}
