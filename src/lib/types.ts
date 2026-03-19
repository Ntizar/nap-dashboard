// Tipos reales de la API NAP Transportes — verificados contra los endpoints

export interface TipoTransporte {
  tipoTransporteId: number
  nombre: string
  tipoTransporteGrupoId?: number
  tipoTransporteGrupo?: string
}

export interface TipoFichero {
  id: number
  nombre: string
}

export interface Region {
  regionId: number
  nombre: string
  tipo: number
  tipoNombre: string
}

export interface Organizacion {
  organizacionId: number
  nombre: string
  imagen?: unknown
}

export interface Operador {
  operadorId: number
  nombre: string
  url?: string
  conjuntosDatos?: ConjuntoDatos[]
}

export interface FicheroDto {
  ficheroId: number
  tipoFicheroNombre: string
  numeroViajes?: number
  numeroRutas?: number
  numeroParadas?: number
  tamanio?: number
  validado?: boolean
  fechaActualizacion?: string
  fechaDesde?: string
  fechaHasta?: string
  avisos?: unknown[]
  metadatos?: unknown
}

export interface ConjuntoDatos {
  conjuntoDatoId: number
  nombre: string
  descripcion?: string
  organizacion?: Organizacion
  tiposTransporte?: TipoTransporte[]
  ficherosDto?: FicheroDto[]
  regiones?: Region[]
  operadores?: Operador[]
  fechaCreacion?: string
}

// Respuesta de /api/Fichero/GetList
export interface GetListResponse {
  conjuntosDatoDto: ConjuntoDatos[]
  filesNum: number
}

export interface FilterBody {
  provincias?: number[]
  comunidades?: number[]
  areasurbanas?: number[]
  municipios?: number[]
  tipotransportes?: number[]
  tipoficheros?: number[]
  organizaciones?: number[]
}
