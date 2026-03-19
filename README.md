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

## ⚖️ Aviso legal y licencia de datos

**Esta es una herramienta de visualización no oficial.** No está afiliada, patrocinada ni respaldada por el Ministerio de Transportes y Movilidad Sostenible (MITRAMS) ni por el Punto de Acceso Nacional (NAP).

Los datos mostrados en este dashboard son propiedad del **Ministerio de Transportes y Movilidad Sostenible de España** y se publican bajo la [Licencia de Datos Abiertos MITRAMS](https://nap.transportes.gob.es/licencia-datos). Esta herramienta los consume a través de la API pública del NAP respetando sus [condiciones de uso](https://nap.transportes.gob.es/condiciones-uso).

**Lo que esto implica:**

- El uso de los datos es responsabilidad exclusiva del usuario. Esta herramienta no asume ninguna responsabilidad sobre la exactitud, integridad o vigencia de los datos mostrados.
- Los datos se ofrecen *tal y como están* en la fuente original. El MITRAMS no garantiza que todos los datos sean estrictamente correctos, y tampoco lo hace este dashboard.
- No se puede garantizar la disponibilidad continua del servicio, ya que depende de la API pública del NAP.
- Cualquier uso comercial o redistribución de los datos debe cumplir con la licencia MITRAMS, que exige citar la fuente y no desnaturalizar la información.

> **Powered by MITRAMS** — Fuente original: [nap.transportes.gob.es](https://nap.transportes.gob.es)

---

## 🤖 ¿Cómo se construyó este programa?

Este proyecto fue desarrollado íntegramente mediante un **sistema multi-agente de inteligencia artificial**, sin escribir código manualmente. Funciona como una demostración real de lo que es posible con la orquestación de agentes de IA en 2025–2026.

### El sistema: Ntizar Brain

La herramienta utilizada es **Ntizar Brain**, un sistema operativo de inteligencia construido sobre [Obsidian](https://obsidian.md) y [OpenCode](https://opencode.ai). No es un chatbot: es un pipeline de agentes especializados que se activan en secuencia según el tipo de tarea.

### Los agentes que participaron

Cada ciclo de desarrollo siguió el mismo flujo de agentes, en orden:

| Agente | Rol | Lo que hizo en este proyecto |
|--------|-----|------------------------------|
| **Classifier** | Detecta el tipo de tarea y diseña el flujo | Identificó si cada petición era feature nueva, bug, refactoring o documentación |
| **Explorer** | Lee y analiza el contexto existente sin modificar nada | Leyó el código antes de cada cambio para entender la arquitectura actual |
| **Planner** | Diseña la estrategia y los pasos concretos | Decidió el orden de implementación de cada bloque (A, B, C en cada ciclo) |
| **Spec Writer** | Genera una especificación ejecutable y verificable | Produjo las tablas de spec (D1–D12) que se aprobaron antes de codificar |
| **Implementer** | Ejecuta la spec en el código real | Escribió todo el código: TypeScript, React, Tailwind, funciones serverless |
| **Reviewer** | Valida calidad y coherencia del output | Detectó los CRITICALs y WARNINGs antes de cada commit (ej: grid responsive, normalizeTime) |
| **Critic** | Busca fallos que el reviewer no vio | Segunda pasada de revisión en cambios de alto impacto |
| **Synthesizer** | Resume y comunica resultados | Generó los resúmenes de ciclo que se presentaron al humano |
| **Archiver** | Destila aprendizaje permanente | Documentó en el sistema las lecciones clave (ej: S3 del NAP, tsconfig en Vercel) |

### El ciclo de trabajo

```
Humano da la tarea
      ↓
CLASSIFY → EXPLORE → PLAN → SPEC
                               ↓
                    Humano aprueba la spec ✅
                               ↓
                    IMPLEMENT → REVIEW → CRITIC
                               ↓
                    SYNTHESIZE → (Humano aprueba ✅)
                               ↓
                           ARCHIVE
```

El humano solo interviene en dos puntos: **aprobar la spec** antes de que se empiece a codificar, y **aprobar el resultado** antes de que se archive el aprendizaje. Todo lo demás lo ejecutan los agentes.

### Lo que se construyó en esta sesión

En una sola sesión de trabajo se completaron:

- **4 ciclos de desarrollo** (v1.0 → v1.4.0)
- **8 ficheros creados o modificados** en profundidad
- **~2.500 líneas de código** TypeScript/React escritas o refactorizadas
- **1 sistema de parsing GTFS** propio con soporte de encoding, tolerancia a errores, calendarios y excepciones
- **1 proxy serverless** en Vercel con whitelist de seguridad
- **Responsive completo** para móvil y escritorio
- **Deploy en producción** con corrección de bugs en tiempo real

Todo esto sin escribir una sola línea de código manualmente.

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
