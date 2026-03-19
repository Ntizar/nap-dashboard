# NAP Dashboard — Transportes de España

Dashboard web que visualiza el catálogo completo de datos de transporte público de España, publicado por el Ministerio de Transportes a través del **Punto de Acceso Nacional (NAP)** en [nap.transportes.gob.es](https://nap.transportes.gob.es).

Al abrir la app por primera vez, se solicita tu API key del NAP. Se guarda en el navegador (`localStorage`) y nunca abandona tu dispositivo.

## Qué hace

| Página | Descripción |
|--------|-------------|
| **Resumen** | KPIs generales (datasets, organizaciones, regiones, tipos de transporte) + gráficos de distribución |
| **Datasets** | Tabla paginada del catálogo completo con filtros por transporte y organización |
| **Operadores** | Directorio de los ~2.594 operadores registrados con búsqueda y paginación |
| **Mapa** | Mapa interactivo de España mostrando cobertura de datasets por región |
| **GTFS Viewer** | Visualizador interactivo de ficheros GTFS: rutas en el mapa, paradas y horarios |

## Stack

- **Frontend:** React 19 + TypeScript + Vite 5
- **Estilos:** Tailwind CSS 4
- **Data fetching:** TanStack Query v5 (caché 5 min)
- **Gráficos:** Recharts
- **Mapa:** Leaflet + React-Leaflet
- **GTFS parsing:** fflate (descompresión ZIP en el browser) + CSV parser nativo
- **Deploy:** Vercel (Serverless Functions para el proxy)

## Arquitectura de seguridad

La API del NAP requiere una `ApiKey` en cada request. Esta key **nunca está en el código ni en el repositorio**:

```
Browser → /api/nap/* → [Vercel Serverless Function] → nap.transportes.gob.es
                              ↑
               1. Lee NAP_API_KEY del entorno de Vercel (si existe)
               2. O bien, lee X-Api-Key del header del cliente (key del usuario en localStorage)
```

**Flujo para el usuario:**
1. Abre la app → aparece un modal pidiendo la API key del NAP
2. La introduce una sola vez → se guarda en `localStorage` del navegador
3. Todas las peticiones incluyen la key en el header `X-Api-Key`
4. El proxy Vercel la inyecta como `ApiKey` hacia el NAP — nunca llega al bundle JS

La key puede cambiarse en cualquier momento desde "Cambiar API key" en el menú lateral.

## Setup local

### Requisitos

- **Node.js** >= 20.15.0
- **npm** >= 10

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/nap-dashboard.git
cd nap-dashboard
npm install
```

### 2. Configurar la API key

Crea el fichero `.env.local` (está en `.gitignore`, nunca se sube):

```bash
cp .env.example .env.local
# Edita .env.local y añade tu API key del NAP:
# NAP_API_KEY=tu-api-key-aqui
```

Puedes solicitar una API key en [nap.transportes.gob.es](https://nap.transportes.gob.es).

### 3. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El proxy de Vite intercepta todas las llamadas a `/api/nap/*` y añade la key automáticamente.

### 4. Build de producción

```bash
npm run build
```

Genera `dist/`. Para previsualizar localmente:

```bash
npm run preview
```

> **Nota:** `npm run preview` no incluye el proxy. Para probar la integración completa con la API necesitas hacer deploy en Vercel o usar `vercel dev`.

## Deploy en Vercel

### Opción A — Desde la web de Vercel (recomendado)

1. Sube el repositorio a GitHub
2. Ve a [vercel.com/new](https://vercel.com/new) e importa el repositorio
3. En **Environment Variables**, añade:
   - **Name:** `NAP_API_KEY`
   - **Value:** tu API key del NAP
4. Haz clic en **Deploy**

Vercel detecta automáticamente que es un proyecto Vite y aplica la configuración de `vercel.json`.

### Opción B — Desde la CLI de Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Durante el setup, añade la variable de entorno cuando te la pida, o después desde el dashboard de Vercel en **Settings → Environment Variables**.

### Variables de entorno requeridas en Vercel

| Variable | Descripción |
|----------|-------------|
| `NAP_API_KEY` | API key del Punto de Acceso Nacional de transportes |

## Estructura del proyecto

```
nap-dashboard/
├── api/
│   └── nap/
│       └── proxy.ts          # Serverless Function — proxy con ApiKey server-side
├── src/
│   ├── lib/
│   │   ├── types.ts           # Tipos TypeScript del schema real de la API NAP
│   │   └── napClient.ts       # Cliente HTTP (todas las llamadas a /api/nap/*)
│   ├── hooks/
│   │   └── useNap.ts          # TanStack Query hooks con caché de 5 minutos
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Navegación lateral
│   │   │   └── Header.tsx     # Cabecera de página
│   │   ├── cards/
│   │   │   ├── KpiCard.tsx    # Tarjeta de KPI
│   │   │   └── Skeleton.tsx   # Loaders animados
│   │   └── charts/
│   │       ├── HorizontalBarChart.tsx
│   │       └── DonutChart.tsx
│   └── pages/
│       ├── Overview.tsx       # Vista general con KPIs y gráficos
│       ├── Datasets.tsx       # Tabla filtrable del catálogo
│       ├── Operadores.tsx     # Directorio de operadores
│       └── Mapa.tsx           # Mapa de cobertura por región
├── .env.example               # Plantilla de variables de entorno
├── vercel.json                # Rewrite /api/nap/* → proxy serverless
└── vite.config.ts             # Proxy de desarrollo local
```

## API cubierta

Endpoints del NAP que consume el dashboard:

| Endpoint | Descripción |
|----------|-------------|
| `GET /Fichero/GetList` | Lista completa de datasets del catálogo |
| `POST /Fichero/Filter` | Filtrado de datasets por región/transporte/organización |
| `GET /Fichero/downloadLink/:id` | URL de descarga de un fichero (GTFS, NeTEx, etc.) |
| `GET /TipoTransporte` | Catálogo de tipos de transporte (bus, tren, metro…) |
| `GET /Region` | Regiones geográficas (~8.288 entradas) |
| `GET /Organizacion` | Organizaciones publicadoras |
| `GET /Operador` | Operadores de transporte (~2.594 entradas) |

## Limitaciones conocidas

- **Mapa:** Solo muestra pins para regiones con coordenadas en el diccionario `REGION_COORDS` de `Mapa.tsx`. Regiones con nombres no reconocidos no aparecen en el mapa (sí en el panel lateral).
- **Operadores:** Los ~2.594 operadores se cargan en memoria en una sola petición. No hay paginación server-side en la API del NAP.
- **Error 401:** Si la `NAP_API_KEY` no está configurada, la app muestra un banner de error genérico. Asegúrate de que la variable está presente en Vercel antes de hacer deploy.

## Licencia

Los datos son publicados por el Ministerio de Transportes de España bajo la licencia abierta del NAP. El código de este dashboard es de uso libre.
