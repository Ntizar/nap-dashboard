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

> **Spoiler: no se escribió ni una sola línea de código manualmente.**

Este proyecto es la demostración práctica de un método de trabajo que David Antizar lleva desarrollando durante meses: construir software complejo usando un sistema propio de inteligencia artificial multi-agente, sin tocar el teclado para programar.

---

### 🧠 Qué es el Mastermind

El **Mastermind** es el nombre que David da a su sistema personal de trabajo con IA. No es una herramienta de terceros ni un producto comercial: es una arquitectura que él ha diseñado y construido para sí mismo, que combina:

- **Obsidian** como sistema nervioso central — toda la memoria, contexto, aprendizajes y documentación del proyecto viven aquí en ficheros Markdown enlazados entre sí
- **OpenCode** como motor de ejecución — el agente de IA que lee el contexto, razona y ejecuta acciones reales (leer ficheros, escribir código, lanzar comandos, hacer commits)
- **Un protocolo de agentes** diseñado por David que define cómo deben pensar y actuar los distintos roles

La idea central es simple pero poderosa: **el humano define qué quiere, el sistema decide cómo hacerlo y lo ejecuta**. David no programa. David dirige.

---

### 🏗️ Qué es Ntizar Brain

**Ntizar Brain** es la instancia concreta del Mastermind que vive en el sistema de David. Es su cerebro operativo personal: un conjunto de ficheros en Obsidian que definen exactamente cómo se comporta el sistema, qué agentes existen, qué reglas siguen y qué han aprendido en sesiones anteriores.

Dentro de Ntizar Brain hay tres tipos de contenido:

| Tipo | Qué contiene |
|------|-------------|
| **Agentes** (`agents/`) | Los 10 ficheros que definen el rol, las reglas y el comportamiento de cada agente del sistema |
| **Estado** (`agents/state/`) | La configuración del sistema y el estado de la sesión actual — qué se está construyendo, en qué fase está, qué decisiones se han tomado |
| **Skills y templates** (`agents/skills/`, `agents/templates/`) | Conocimiento reutilizable destilado de sesiones anteriores — cómo hacer un deploy en Vercel, cómo estructurar un parser GTFS, cómo manejar CORS, etc. |

Cada vez que David empieza una sesión, el sistema lee su propio estado y continúa desde donde lo dejó. No hay pérdida de contexto entre sesiones.

---

### 👥 Los 10 agentes del sistema

El sistema no tiene un único agente que "hace todo". Tiene 10 agentes especializados que se activan en secuencia, cada uno con una responsabilidad clara y delimitada:

| # | Agente | Su único trabajo |
|---|--------|-----------------|
| 0 | **Orchestrator** | Lee el estado del sistema al inicio de cada sesión y coordina qué agentes se activan |
| 1 | **Classifier** | Recibe la petición del humano y decide qué tipo de tarea es y qué agentes necesita |
| 2 | **Explorer** | Lee código, ficheros y contexto existente. **Nunca modifica nada.** Solo entiende |
| 3 | **Planner** | Con el contexto del Explorer, diseña la estrategia: qué se hace, en qué orden, por qué |
| 4 | **Spec Writer** | Convierte el plan en una especificación técnica concreta, verificable y aprobable por el humano |
| 5 | **Implementer** | Con la spec aprobada, escribe el código real. No decide qué hacer — solo ejecuta la spec |
| 6 | **Reviewer** | Revisa el código del Implementer buscando bugs, inconsistencias y problemas de calidad |
| 7 | **Critic** | Segunda revisión más agresiva. Busca lo que el Reviewer no vio. Se activa en cambios críticos |
| 8 | **Synthesizer** | Resume lo que se hizo, en lenguaje claro, para presentárselo al humano |
| 9 | **Archiver** | Tras la aprobación humana, extrae los aprendizajes de la sesión y los persiste en el sistema |

La separación de roles es deliberada. El Implementer no puede tomar decisiones de arquitectura — eso es del Planner. El Reviewer no puede modificar código — solo señalar problemas. Cada agente hace una sola cosa y la hace bien.

---

### 🔄 El ciclo de trabajo exacto

Así fue exactamente cómo se construyó este dashboard:

```
David escribe en lenguaje natural lo que quiere
              ↓
    CLASSIFIER → identifica el tipo de tarea
              ↓
    EXPLORER → lee el código existente sin tocar nada
              ↓
    PLANNER → diseña la estrategia
              ↓
    SPEC WRITER → genera especificación técnica

              ⏸ David revisa y aprueba la spec ✅
              ↓
    IMPLEMENTER → escribe todo el código
              ↓
    REVIEWER → detecta bugs y problemas
              ↓
    CRITIC → segunda revisión
              ↓
    SYNTHESIZER → resume el resultado para David

              ⏸ David aprueba el resultado ✅
              ↓
    ARCHIVER → guarda los aprendizajes en Ntizar Brain
```

David interviene **exactamente dos veces** por ciclo: para aprobar la spec antes de que se empiece a codificar, y para aprobar el resultado antes de que se archive. Todo lo demás ocurre sin su intervención.

---

### 📊 Lo que produjo el sistema en esta sesión

Una sola sesión de trabajo, con conversación en lenguaje natural, produjo:

| Métrica | Resultado |
|---------|-----------|
| Ciclos completados | 4 (v1.0 → v1.4.0) |
| Ficheros creados o modificados en profundidad | 8 |
| Líneas de código escritas o refactorizadas | ~2.500 |
| Bugs detectados y corregidos por el Reviewer/Critic | 6 |
| Bugs de producción corregidos en tiempo real | 2 (403 S3, TS errors Vercel) |
| Tiempo de intervención humana directa | ~15 minutos en aprobaciones |
| Código escrito manualmente por David | **0 líneas** |

---

### 💡 Por qué importa esto

No es un truco. No es "ChatGPT escribe código". Es un método de ingeniería aplicado a la IA:

- **El sistema tiene memoria** — Ntizar Brain recuerda decisiones anteriores, arquitecturas elegidas y bugs ya resueltos
- **El sistema aprende** — cada sesión deja aprendizajes persistentes que mejoran las siguientes
- **El sistema tiene responsabilidades separadas** — ningún agente hace todo, lo que elimina alucinaciones y errores de contexto
- **El humano mantiene el control** — David aprueba cada spec antes de que se ejecute. No hay sorpresas

David no ha abandonado el criterio ni la visión del producto. Ha delegado la ejecución técnica. La diferencia entre un director de cine y un camarógrafo.

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
