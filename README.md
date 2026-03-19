# 🚌 NAP Dashboard — Transportes de España

> Explora el transporte público de todo un país. En el navegador. En tiempo real. Sin instalar nada.

**v1.4.0** · Hecho por **David Antizar** con su Mastermind 🧠

---

¿Sabías que el Ministerio de Transportes de España publica los horarios de **todos** los autobuses, trenes, metros, tranvías y ferries del país en formato abierto? Miles de datasets. Decenas de millones de registros. Todo accesible vía API.

El problema: el portal oficial solo permite buscar y descargar ficheros. No hay forma de ver qué hay dentro de un GTFS sin abrir un terminal o instalar herramientas externas.

**Esto lo resuelve.** 🎯

---

## ✨ Qué puedes hacer

| | Sección | Para qué sirve |
|--|---------|----------------|
| 📊 | **Resumen** | KPIs del catálogo, actividad mensual, top datasets, distribución de formatos |
| 📋 | **Datasets** | Tabla completa con filtros por tipo de transporte y organización |
| 🏢 | **Operadores** | Directorio de los ~2.594 operadores de transporte registrados |
| 🗺️ | **Mapa** | Cobertura geográfica sobre un mapa interactivo de España |
| 🔍 | **GTFS Viewer** | Abre cualquier GTFS: rutas en el mapa, paradas, horarios por día, excepciones de servicio |

---

## 🗓️ La feature estrella: selector de semana en el GTFS Viewer

El visor no se limita a mostrar todos los viajes de un feed. Implementa la lógica completa del estándar GTFS para saber qué servicios operan en cada día concreto:

- Navega entre días de la semana con un selector visual compacto
- Los viajes mostrados son **solo los que realmente circulan ese día**
- Si un servicio está cancelado ese día → banner rojo ⚠️
- Si hay un servicio extraordinario → banner verde ✅
- "Próximas salidas" cuando es hoy · "Salidas del día" cuando es otro día

---

## 🔧 Cómo funciona por dentro

El visor descarga y procesa los ficheros GTFS comprimidos (ZIP) directamente en el navegador, sin servidor, sin backend propio. El parsing incluye:

- **Descompresión en memoria** con `fflate` — sin escribir nada en disco
- **Detección de encoding** — fallback UTF-8 → Windows-1252 cuando se detectan caracteres corruptos (`\uFFFD`)
- **Tolerancia a ficheros malformados** — cada fila se parsea en `try/catch`; las filas con errores se cuentan y se notifican en la pestaña Info sin romper el resto
- **Tipos de ruta europeos extendidos** (NeTEx 100–1700): tren de alta velocidad, cercanías, metro, tranvía, funicular, teleférico, ferry, etc.
- **Cap de `stop_times`** — limitado a 100.000 registros para no bloquear el hilo principal en ficheros masivos

**Calendario semanal con filtrado real:**

El visor implementa la lógica completa del estándar GTFS para determinar si un servicio opera en un día concreto:

1. Comprueba primero `calendar_dates.txt` (excepciones puntuales — tienen prioridad)
2. Si no hay excepción, consulta `calendar.txt` (días de la semana + rango de fechas)
3. Si un servicio solo usa `calendar_dates.txt` (sin `calendar.txt`), funciona igualmente

Con esto, el selector de semana muestra únicamente los viajes que realmente operan en el día seleccionado — no todos los viajes del feed.

---

## 📸 Capturas de pantalla

> *(añade imágenes aquí una vez desplegado)*

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| UI framework | React 19 + TypeScript |
| Build | Vite 5 |
| Estilos | Tailwind CSS 4 |
| Datos / caché | TanStack Query v5 |
| Gráficos | Recharts |
| Mapas | Leaflet + React-Leaflet |
| Parsing GTFS | Parser propio + fflate (descompresión ZIP en el navegador) |
| Proxy API | Vercel Serverless Functions |

**Seguridad de la API key:** la clave nunca está en el código ni en el repositorio. Al abrir la app por primera vez, se solicita al usuario mediante un modal y se guarda en `localStorage`. El proxy Vercel la inyecta hacia el NAP. Si se configura `NAP_API_KEY` en las variables de entorno de Vercel, esa tiene prioridad.

```
Browser → /api/nap/* → [Vercel Proxy] → nap.transportes.gob.es
                              ↑
             NAP_API_KEY (entorno) o X-Api-Key (usuario)
```

---

## 💻 Setup local

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

## 🚀 Deploy en Vercel

1. Sube el repositorio a GitHub
2. Importa el proyecto en [vercel.com/new](https://vercel.com/new)
3. En **Environment Variables**, añade `NAP_API_KEY` con tu API key del NAP
4. Haz clic en **Deploy**

Vercel detecta automáticamente la configuración de Vite y aplica `vercel.json`.

---

## ⚠️ Limitaciones conocidas

- Ficheros GTFS muy grandes (>15 MB descomprimidos) pueden tardar varios segundos en procesarse — el parsing ocurre en el hilo principal del navegador.
- El mapa de cobertura regional muestra solo regiones con coordenadas en el diccionario interno. Regiones con nombres no reconocidos aparecen en el panel lateral pero no en el mapa.
- Los ~2.594 operadores se cargan en una sola petición (la API del NAP no ofrece paginación server-side para ese endpoint).

---

## 📋 Changelog

### v1.4.0 (2026-03-19) — Calendario semanal y excepciones de servicio en el GTFS Viewer

**Selector de semana en la pestaña Horarios:**
- 7 botones día (Lun–Dom) para la semana de la fecha seleccionada, con el día activo resaltado
- Flechas `←` `→` para navegar entre semanas; botón "Hoy" para volver a la fecha actual
- El día de hoy tiene estilo visual diferenciado incluso cuando no es el seleccionado

**Filtrado real por calendario GTFS:**
- Los viajes mostrados son solo los activos en la fecha seleccionada, aplicando la lógica completa de `calendar.txt` + `calendar_dates.txt`
- El contador de viajes pasa a mostrar "N viajes activos" en lugar del total del feed
- Corrección: viajes con hora de salida ≥ 24:00 (overnight) ya no aparecen en listas equivocadas

**Banners de excepciones de servicio:**
- Banner rojo si algún servicio de la ruta tiene `exception_type=2` (servicio cancelado) en la fecha seleccionada
- Banner verde si tiene `exception_type=1` (servicio adicional)

**"Próximas salidas" contextual:**
- Si la fecha es hoy → muestra las próximas salidas a partir de la hora actual
- Si es otro día → muestra "Salidas del día" (todas las del día, max 10, ordenadas)

**Pestaña Info — sección Calendario de servicio:**
- Para cada entrada de `calendar.txt`: badges con los días activos (L M X J V S D) + rango de fechas + total de días
- Si el feed solo usa `calendar_dates.txt`: mensaje con el número de fechas registradas

---

### v1.3.0 (2026-03-19) — Dashboard enriquecido + GTFS robusto + Responsive completo

**Overview enriquecido:**
- KPIs secundarios: total de ficheros, datasets validados, datasets con alertas
- Gráfico de actividad (AreaChart) con ficheros actualizados por mes, últimos 12 meses
- Tabla Top 5 datasets por volumen de rutas/paradas, con iconos de transporte y navegación directa al visor
- Distribución de formatos (GTFS / NeTEx / DATEX II / SIRI / Otros) como HorizontalBarChart

**GTFS Viewer robusto:**
- Fallback de encoding UTF-8 → Windows-1252 cuando se detectan caracteres corruptos
- Tolerancia a filas malformadas con conteo de errores en la pestaña Info
- Tipos de ruta europeos extendidos (NeTEx 100–1700)
- Selector de viajes paginado (25/página) con búsqueda por cabecera, nombre o primera salida

**Responsive completo:**
- Sidebar convertido en drawer lateral en móvil con overlay y botón de cierre
- GtfsViewer: paneles izquierdo y derecho como drawers en móvil con toolbar propio
- Datasets: filtros apilados en móvil, columnas de tabla ocultas progresivamente
- `font-size: 16px` en inputs/selects para evitar zoom automático en iOS

---

### v1.2.0 — GTFS Viewer avanzado con mapa, paradas y horarios
### v1.1.0 — Mapa interactivo de cobertura regional
### v1.0.0 — Dashboard inicial (Resumen, Datasets, Operadores)

---

Hecho por **David Antizar** con su Mastermind.
