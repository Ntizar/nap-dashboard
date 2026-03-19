# NAP Dashboard — Transportes de España

Dashboard web para explorar el catálogo oficial de datos de transporte público de España, publicado por el Ministerio de Transportes a través del **Punto de Acceso Nacional (NAP)**.

---

## Por qué existe

El [Punto de Acceso Nacional](https://nap.transportes.gob.es) agrega miles de conjuntos de datos de transporte público de toda España: horarios de bus, tren, metro, tranvía y más, en formatos estándar como GTFS y NeTEx. El portal oficial permite buscar y descargar ficheros, pero no ofrece una visión analítica del catálogo ni una forma rápida de visualizar el contenido de un fichero GTFS sin herramientas externas.

Este dashboard resuelve eso: una interfaz que consume la API del NAP en tiempo real, presenta los datos de forma visual e interactiva, y permite abrir cualquier fichero GTFS directamente en el navegador para ver sus rutas, paradas y horarios en un mapa.

---

## Qué puede hacer

| Sección | Para qué sirve |
|---------|----------------|
| **Resumen** | Vista general del catálogo: cuántos datasets hay, cuántos operadores, qué tipos de transporte predominan y cómo se distribuyen por región |
| **Datasets** | Tabla completa del catálogo con filtros por tipo de transporte y organización |
| **Operadores** | Directorio de los ~2.594 operadores de transporte registrados en el NAP |
| **Mapa** | Cobertura geográfica de los datasets sobre un mapa interactivo de España |
| **GTFS Viewer** | Selecciona cualquier fichero GTFS del catálogo y visualiza sus rutas en el mapa, explora sus paradas y consulta los horarios |

---

## Cómo se construyó

El proyecto es una SPA (Single Page Application) que se comunica con la API del NAP a través de un proxy serverless desplegado en Vercel. El proxy es necesario porque la API del NAP bloquea peticiones CORS desde el navegador.

**Stack principal:**

- **React 19 + TypeScript + Vite 5** — interfaz y tooling
- **TanStack Query v5** — gestión de datos con caché automática
- **Tailwind CSS 4** — estilos
- **Recharts** — gráficos de distribución
- **Leaflet + React-Leaflet** — mapas interactivos
- **fflate** — descompresión de ficheros GTFS (ZIP) directamente en el navegador
- **Vercel Serverless Functions** — proxy que añade la API key hacia el NAP

**Seguridad de la API key:**

La API del NAP requiere una clave de acceso. Esta clave nunca está en el código ni en el repositorio. Al abrir la app por primera vez, se solicita la key al usuario mediante un modal; se guarda en `localStorage` del navegador y se envía en cada petición como header `X-Api-Key`. El proxy Vercel la inyecta como `ApiKey` hacia el NAP. Si se configura la variable de entorno `NAP_API_KEY` en Vercel, esta tiene prioridad sobre la key del usuario.

```
Browser → /api/nap/* → [Vercel Proxy] → nap.transportes.gob.es
                              ↑
             NAP_API_KEY (entorno) o X-Api-Key (usuario)
```

---

## Setup local

**Requisitos:** Node.js >= 20.15.0, npm >= 10

```bash
git clone https://github.com/tu-usuario/nap-dashboard.git
cd nap-dashboard
npm install
```

Crea el fichero `.env.local` con tu API key del NAP (puedes solicitarla en [nap.transportes.gob.es](https://nap.transportes.gob.es)):

```bash
cp .env.example .env.local
# Edita .env.local:
# NAP_API_KEY=tu-api-key-aqui
```

Arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El proxy de Vite intercepta las llamadas a `/api/nap/*` automáticamente.

---

## Deploy en Vercel

1. Sube el repositorio a GitHub
2. Importa el proyecto en [vercel.com/new](https://vercel.com/new)
3. En **Environment Variables**, añade `NAP_API_KEY` con tu API key del NAP
4. Haz clic en **Deploy**

Vercel detecta automáticamente la configuración de Vite y aplica `vercel.json`.

---

## Limitaciones conocidas

- Los ficheros GTFS grandes (>10 MB) pueden tardar varios segundos en procesarse, ya que la descompresión y el parsing ocurren en el hilo principal del navegador.
- El mapa de cobertura regional solo muestra las regiones con coordenadas conocidas en el diccionario interno. Regiones con nombres no reconocidos aparecen en el panel lateral pero no en el mapa.
- Los ~2.594 operadores se cargan en memoria en una sola petición (la API del NAP no ofrece paginación server-side para este endpoint).

---

## Datos y licencia

Los datos son publicados por el Ministerio de Transportes, Movilidad y Agenda Urbana de España bajo la licencia abierta del NAP. El código de este dashboard es de uso libre.
