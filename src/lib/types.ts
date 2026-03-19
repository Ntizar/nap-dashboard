// Tipos de la API NAP Transportes — nap.transportes.gob.es

export interface TipoTransporte {
  id: number
  nombre: string
  descripcion?: string
}

export interface TipoFichero {
  id: number
  nombre: string
  descripcion?: string
}

export interface Region {
  id: number
  nombre: string
  tipoRegion: number
  tipoRegionNombre?: string
}

export interface Organizacion {
  id: number
  nombre: string
  url?: string
  logoUrl?: string
}

export interface Operador {
  id: number
  nombre: string
  conjutosDatos?: ConjuntoDatos[]
}

export interface Fichero {
  id: number
  nombre: string
  url?: string
  tipoFichero?: TipoFichero
  fechaActualizacion?: string
  avisos?: number
  metadatos?: Record<string, string>
}

export interface ConjuntoDatos {
  id: number
  nombre: string
  descripcion?: string
  organizacion?: Organizacion
  tiposTransporte?: TipoTransporte[]
  ficheros?: Fichero[]
  regiones?: Region[]
  operadores?: Operador[]
  fechaActualizacion?: string
  urlDescarga?: string
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

// Tipo de región (del endpoint /api/Region/GetTypes)
export const TIPO_REGION = {
  PROVINCIA: 1,
  COMUNIDAD: 2,
  AREA_URBANA: 3,
  MUNICIPIO: 4,
} as const
