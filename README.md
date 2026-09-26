# 📅 Gestión de Turnos Laborales

Aplicación web progresiva (**PWA**) para la **planificación, generación automática, sincronización y exportación de cuadrantes de turnos laborales semanales**. Diseñada para comercios, hostelería, pastelerías o pymes que operan con turnos de Mañana y Tarde.

Funciona de forma **híbrida (Offline-First)**: opera al 100% en el navegador con `localStorage` y soporte sin conexión mediante Service Worker, y ofrece **sincronización multi-dispositivo y autenticación en la nube** a través de **Supabase**.

---

## 🚀 Características Principales

### 🧠 Motor y Planificación Inteligente
- **Asignación Heurística Inteligente**: Algoritmo que distribuye descansos y turnos respetando la capacidad de la plantilla y la demanda requerida para cada día.
- **Patrón Rotativo Cíclico de Días Libres (Ciclo de 7 Semanas)**:
  - Rueda continua de 7 fases donde los 2 días libres consecutivos se desplazan exactamente 1 día hacia adelante cada semana:
    - **Semana 1**: Lunes y Martes (`[0, 1]`)
    - **Semana 2**: Martes y Miércoles (`[1, 2]`)
    - **Semana 3**: Miércoles y Jueves (`[2, 3]`)
    - **Semana 4**: Jueves y Viernes (`[3, 4]`)
    - **Semana 5**: Viernes y Sábado (`[4, 5]`)
    - **Semana 6**: Sábado y Domingo (`[5, 6]`)
    - **Semana 7**: Domingo y Lunes (`[6, 0]`)
  - Al cambiar de semana en el calendario, el sistema avanza automáticamente el ciclo para cada trabajador de manera equitativa.
  - La tarjeta de cada empleado incluye un selector para personalizar su semana de inicio en el ciclo.
- **Generador Multi-Semanal y Navegación entre Semanas**:
  - Selector de horizonte de planificación: genera de 1 a 12 semanas (1, 2, 3, 4, 7, 8 o 12 semanas) en un solo clic.
  - Cada semana se calcula y almacena individualmente con sus fechas de calendario.
  - Barra interactiva de navegación con pestañas tipo *pill* para alternar instantáneamente entre todas las semanas generadas sin recargar.
- **Matriz de Demanda Personalizable por Semana**:
  - Cada semana a planificar puede tener su propia dotación de personal específica por turno y día (ideal para semanas con eventos especiales o picos de trabajo).
  - Pestañas de selección rápida dentro del bloque de demanda para editar la matriz de cualquier semana individual.
  - Botón `📋 Copiar a todas las semanas` para propagar los valores de una semana a todo el horizonte planificado en un solo clic.
- **Alternancia Estricta de Turnos Semana a Semana**:
  - Los empleados 2 a N alternan de forma exacta entre dos modalidades de turno de semana a semana:
    - **Semana impar**: **3 turnos de Mañana** + **2 turnos de Tarde** (o viceversa).
    - **Semana par**: **2 turnos de Mañana** + **3 turnos de Tarde**.
  - **Empleado Clave (Empleado 1 - Mar)**: Trabaja exclusivamente **5 turnos de Mañana y 0 de Tarde** todas las semanas.
  - El algoritmo asegura mediante holgura por prioridad y fases de reparación el cumplimiento del 100% de los turnos objetivo de cada empleado.
- **Reglas y Restricciones Duras**:
  - **Dotación Mínima**: Nunca puede haber menos de **2 empleados por turno** en ningún día de la semana.
  - **Fines de Semana Reforzados**: Los **viernes, sábados y domingos** siempre cuentan obligatoriamente con **3 empleados por cada turno** (3 Mañanas + 3 Tardes = 6 trabajadores en activo y exactamente 2 descansando en plantillas base).
  - **Días Libres Consecutivos**: Cada empleado disfruta estrictamente de **2 días libres semanales seguidos** (`L`).
  - **Mínimo 1 Mañana por Empleado**: Todos los empleados tienen garantizado al menos **1 turno de Mañana** a la semana.
- **Optimización Ergonómica de Descanso**:
  - Reduce al mínimo las secuencias fatigosas de **Tarde seguida de Mañana** (`T -> M`).
  - Realiza intercambios recíprocos entre trabajadores que preservan de forma exacta los totales de mañana y tarde de cada trabajador.

### 📱 Experiencia de Usuario y Visualización
- **Progressive Web App (PWA) e Instalación**:
  - Compatible con instalación nativa en dispositivos móviles (Android/iOS) y de escritorio (Chrome/Edge/Safari).
  - Funcionamiento offline total gracias al Service Worker (`sw.js`).
- **Modo Oscuro / Claro**: Selector integrado con detección automática de preferencias del sistema y persistencia del tema.
- **Vista Cuadrante y Vista Individual**:
  - **Cuadrante Global**: Matriz semanal completa por días y turnos con reasignación en vivo.
  - **Vista Individual**: Desglose personalizado por empleado con cálculo automático de turnos y horas totales.
- **Auditoría y Balance en Vivo**:
  - Supervisión en tiempo real del cumplimiento de demanda diaria, garantía de mañanas, 2 días libres seguidos, correspondencia con el patrón rotativo (`[Sem.X]`) y cumplimiento de alternancia de turnos.
- **Exportación Versátil**:
  - **PDF Profesional**: A4 apaisado (*landscape*) listo para imprimir generado vía `html2pdf.js`.
  - **Excel / CSV**: Exportación con codificación UTF-8 BOM compatible con Microsoft Excel y Google Sheets.
  - **Compartir por WhatsApp**: Formateador de texto estructurado con emojis listo para copiar al portapapeles o enviar por mensajería.
- **Nube y Sincronización (Supabase)**:
  - Autenticación de usuario.
  - Sincronización automática de configuraciones (`user_config`) y cuadrantes generados (`weekly_schedules`) con debouncing para evitar peticiones redundantes.
  - Seguridad a nivel de fila mediante Row Level Security (RLS).

---

## 📋 Reglas del Motor de Planificación

El motor (`Scheduler` en [`src/scheduler.js`](file:///home/d4rkd4y/workspace/turnos/src/scheduler.js)) opera en 4 fases:

1. **Validaciones de Capacidad**:
   - **Capacidad Total**: La demanda total de la semana no puede superar la capacidad máxima disponible ($\text{Empleados} \times 5$ días laborables).
   - **Capacidad Diaria**: En ningún día la demanda $(\text{Mañana} + \text{Tarde})$ puede superar la plantilla total de empleados.
   - **Capacidad de Mañanas**: La demanda total de mañanas debe ser suficiente para cubrir las 5 mañanas del Empleado 1 y al menos 1 mañana para cada uno de los restantes $N - 1$ empleados ($\text{Demanda Mañanas} \ge N + 4$).
2. **Fase 1 y 2 (Asignación de Descansos por Patrón Rotativo)**:
   - Determina la semana efectiva del ciclo (Semana 1 a 7) para cada empleado a partir de la fecha seleccionada en el calendario y su configuración de inicio.
   - Asigna los 2 días libres continuos (`L`) correspondientes a cada trabajador.
   - Para el Empleado 1 (Mar), asigna exclusivamente turno de Mañana (`M`) en sus 5 días laborables restantes.
3. **Fase 3 (Asignación de Turnos Mañana/Tarde y Mínimo Garantizado)**:
   - Contabiliza con precisión los turnos de mañana ya cubiertos por el empleado clave.
   - Asigna los turnos restantes (`M` y `T`) priorizando a quienes aún no tienen turno de mañana y balanceando la carga acumulada.
   - Aplica un paso de garantía estricta para asegurar que **todos los empleados tengan al menos 1 turno de mañana**.
4. **Fase 4 (Optimización Ergonómica)**:
   - Detecta transiciones perjudiciales `T -> M` entre días consecutivos.
   - Ejecuta intercambios entre trabajadores en el mismo día preservando invariantes: la demanda diaria se mantiene exacta, cada trabajador mantiene sus días libres intactos y nadie pierde su turno de mañana mínimo.

---

## 🖥️ Estructura del Proyecto

El código está organizado de manera modular en módulos ES6 estándar:

```
.
├── index.html                  # Marcado semántico, contenedores y modal de autenticación
├── style.css                   # Variables CSS, diseño responsivo, temas claro/oscuro e impresión
├── manifest.json               # Configuración PWA (iconos, colores, modo standalone)
├── sw.js                       # Service Worker para caché y funcionamiento offline
├── netlify.toml                # Configuración de despliegue en Netlify, headers y caché
├── package.json                # Configuración de dependencias y scripts de prueba
├── icon-192.png / icon-512.png # Iconos para PWA
├── icon.svg                    # Icono vectorial principal
│
├── src/                        # Código fuente modular (ES6 Modules)
│   ├── app.js                  # Orquestador principal, flujo de inicio y eventos
│   ├── scheduler.js            # Motor heurístico de asignación de turnos (4 fases)
│   ├── renderer.js             # Renderizado del cuadrante, matriz de demanda y controles
│   ├── auditor.js              # Validación en vivo de balances e invariantes
│   ├── exporter.js             # Exportación a PDF, Excel (CSV) y formato WhatsApp
│   ├── individual.js           # Vista y tarjetas de horario individual por empleado
│   ├── storage.js              # Capa de abstracción para persistencia en localStorage
│   ├── sync.js                 # Gestor de sincronización bidireccional (pull/push) con Supabase
│   ├── supabase.js             # Inicialización y cliente de Supabase BaaS
│   ├── theme.js                # Control de tema (modo oscuro/claro)
│   ├── toast.js                # Notificaciones toast flotantes
│   ├── help.js                 # Modal de ayuda interactiva y explicación de reglas
│   └── constants.js            # Constantes de negocio, patrones de rotación y valores por defecto
│
├── supabase/                   # Configuración y migraciones de Supabase
│   ├── config.toml             # Configuración del entorno Supabase CLI
│   └── migrations/
│       └── 20260925000000_init_schema.sql  # Esquema de tablas (user_config, weekly_schedules) y RLS
│
└── tests/                      # Suite de pruebas automatizadas
    └── scheduler.test.js       # Pruebas unitarias para el motor de planificación
```

---

## 🧪 Pruebas Automatizadas

El proyecto utiliza el *test runner* nativo de **Node.js**:

```bash
npm test
```

Las pruebas cubren:
- Rechazo de demandas infactibles y control de sobrecapacidad.
- Validación de turnos del empleado clave (5 Mañanas / 0 Tardes).
- Mínimo de 1 turno de mañana por empleado.
- Días libres continuos y dotaciones requeridas.

---

## 📖 Instrucciones de Uso

1. **Inicio de Sesión (Opcional)**: Inicia sesión con tus credenciales para sincronizar tus cuadrantes en la nube entre múltiples dispositivos, o continúa en modo local sin registro.
2. **Semana de Trabajo**: Selecciona la fecha del lunes de la semana que deseas planificar y el horizonte (1 a 12 semanas).
3. **Plantilla de Empleados**:
   - Ajusta el número de empleados (mínimo 8).
   - Edita los nombres en las tarjetas. El primer empleado actuará como empleado clave en turno de mañana.
   - Configura la semana inicial del ciclo rotativo para cada trabajador si difiere del estándar.
4. **Matriz de Demanda**:
   - Especifica el personal requerido cada día para el turno de **Mañana** y de **Tarde**.
   - Usa el botón `📋 Copiar a todas las semanas` si la demanda es constante.
5. **Generar y Ajustar**:
   - Pulsa **"Generar Cuadrante"**. Si la demanda es factible, se creará el cuadrante semanal.
   - Puedes realizar ajustes manuales en los desplegables (`M`, `T`, `L`); el auditor validará los cambios en tiempo real.
6. **Exportar y Compartir**:
   - **PDF**: Cuadrante maquetado en A4 horizontal.
   - **Excel (CSV)**: Tabla detallada con desglose de horas por trabajador.
   - **WhatsApp**: Copia un resumen estructurado para enviar al equipo.

---

## 🚢 Despliegue y Ejecución Local

### Ejecución Local

Puedes servir los archivos con cualquier servidor HTTP estático:

- **Con Node.js**:
  ```bash
  npx serve .
  ```
- **Con Python**:
  ```bash
  python3 -m http.server 8000
  ```
- **Con VS Code**: Usa la extensión *Live Server*.

### Despliegue en Producción

El proyecto está preparado para plataformas de hosting estático:

- **Netlify**: Incluye [`netlify.toml`](file:///home/d4rkd4y/workspace/turnos/netlify.toml) preconfigurado que ejecuta `npm test` antes del despliegue y aplica cabeceras de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) y políticas de caché óptimas para PWA y assets.
- **Vercel / GitHub Pages**: Compatible directamente publicando la raíz del repositorio.

---

## 🛠️ Tecnologías

- **HTML5 & CSS3**: Diseño responsivo con CSS Grid, Flexbox, variables CSS nativas y soporte para modo oscuro.
- **JavaScript (Vanilla ES6+ Modules)**: Código modular sin empaquetadores complejos (*bundlerless*).
- **Supabase**: Backend-as-a-Service para autenticación de usuarios y base de datos PostgreSQL con RLS.
- **PWA (Progressive Web App)**: Service Worker nativo y Web App Manifest para funcionamiento offline.
- **html2pdf.js**: Generación cliente de documentos PDF en formato apaisado.
- **Node.js Test Runner**: Pruebas automatizadas de lógica de negocio sin dependencias externas pesadas.
