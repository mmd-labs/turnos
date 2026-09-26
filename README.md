# 📅 Gestión de Turnos Laborales

Aplicación web progresiva (**PWA**) para la **planificación, generación automática, sincronización y exportación de cuadrantes de turnos laborales semanales**. Diseñada para comercios, hostelería, pastelerías o pymes que operan con turnos de Mañana y Tarde.

Funciona al **100% en el navegador de forma local (Offline-First)**: opera con `localStorage` y soporte completo sin conexión mediante Service Worker, garantizando total privacidad y funcionamiento sin servidores externos.

Desarrollada bajo **Clean Architecture (Feature-First) + Principios SOLID**, 100% **bundler-less** (módulos nativos ES6 del navegador con contratos JSDoc y verificación estática con TypeScript) y con una completa suite de pruebas automatizadas como gate de despliegue.

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
- **Generador Multi-Semanal Atómico (Two-Phase Commit)**:
  - Selector de horizonte de planificación: genera de 1 a 12 semanas en un solo clic.
  - Ejecución en dos fases: *Dry-run* (cálculo y validación en memoria de todas las semanas) y *Commit* (persistencia atómica únicamente si todas las semanas resultan factibles y coherentes).
  - Barra interactiva de navegación con pestañas tipo *pill* para alternar instantáneamente entre todas las semanas generadas sin recargar.
- **Matriz de Demanda Personalizable por Semana**:
  - Cada semana a planificar puede tener su propia dotación de personal específica por turno y día (ideal para semanas con eventos especiales o picos de trabajo).
  - Pestañas de selección rápida dentro del bloque de demanda para editar la matriz de cualquier semana individual.
  - Botón `📋 Copiar a todas las semanas` para propagar los valores de una semana a todo el horizonte planificado en un solo clic.
- **Alternancia Estricta de Turnos Semana a Semana (Estrategia Abierta OCP)**:
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
- **Persistencia Local y Privacidad Total**:
  - Almacenamiento versionado y seguro en `localStorage` mediante `LocalStorageStore`.
  - Funcionamiento autónomo e instantáneo sin registros ni cuentas de usuario.

---

## 🏛️ Arquitectura del Software (Clean Architecture + SOLID)

El proyecto está diseñado bajo una arquitectura limpia por funcionalidades (**Feature-First**) que garantiza que el núcleo de negocio sea totalmente independiente de frameworks, APIs del navegador y librerías externas.

### Regla de Dependencia y Capas

```
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION                         │
│  (Views, Controllers, CSS, DOM, HTML, Modales, Toast)  │
└───────────────────────────┬────────────────────────────┘
                            │ depends on
┌───────────────────────────▼────────────────────────────┐
│                  APPLICATION / USE CASES               │
│     (GenerateSchedulesUseCase, Ports/Interfaces)       │
└───────────────────────────┬────────────────────────────┘
                            │ depends on
┌───────────────────────────▼────────────────────────────┐
│                         DOMAIN                         │
│ (Entities, Rules: Demand, Patterns, Pure Assignment)   │
└────────────────────────────────────────────────────────┘
                            ▲
                            │ implements ports
┌───────────────────────────┴────────────────────────────┐
│                    INFRASTRUCTURE                      │
│ (LocalStorage, Repositories, Adapters: Export/Share)   │
└────────────────────────────────────────────────────────┘
```

1. **Domain (Núcleo)**: Funciones y entidades 100% puras sin dependencias de I/O ni DOM (`rules/demand.js`, `patterns.js`, `scheduler.js`, `audit-schedule.js`, `csv-builder.js`, `share-text.js`). Testeables instantáneamente en Node.js.
2. **Application (Casos de Uso & Puertos)**: Coordinación de flujos de negocio (`generate-schedules.usecase.js`) e interfaces abstractas mediante JSDoc `@typedef` (`ports.js`).
3. **Infrastructure (Adaptadores)**: Implementación de contratos de persistencia y utilidades externas (`local-schedule.repository.js`, `local-settings.repository.js`, `dom-download.adapter.js`, `navigator-share.adapter.js`, `html2pdf.adapter.js`).
4. **Presentation (Vistas y Controladores)**: Componentes desacoplados orientados a la UI (`schedule-view.js`, `employee-names-view.js`, `demand-view.js`, `week-nav-view.js`) y controladores específicos.
5. **Composition Root (`src/main.js`)**: Punto de entrada único que instancia los adaptadores, repositorios, vistas y controladores conectándolos sin que la UI contenga lógica de negocio.

---

## 🖥️ Estructura del Código

```
.
├── index.html                           # Marcado semántico y contenedores
├── style.css                            # Variables CSS, diseño responsivo y temas
├── manifest.json                        # Manifiesto de PWA
├── sw.js                                # Service Worker con precache y control de versiones
├── jsconfig.json                        # Verificación estática con TypeScript (allowJs + checkJs)
│
├── src/
│   ├── main.js                          # Composition Root: cableado de dependencias y arranque
│   │
│   ├── core/                            # Shared Kernel reutilizable
│   │   ├── constants/                   # Constantes de dominio y storage
│   │   ├── date.js                      # Utilidades de fechas puras (cálculo de lunes, diffs)
│   │   ├── html.js                      # Sanitización y escape HTML puro
│   │   ├── ports/store.port.js          # Interfaz KeyValueStore
│   │   └── infrastructure/
│   │       ├── local-storage.store.js   # Almacenamiento versionado en localStorage
│   │       ├── memory.store.js          # Almacén en memoria para tests
│   │       ├── navigation.service.js    # Servicio pub/sub desacoplado de navegación
│   │       └── persistence-notifier.js  # Notificador reactivo de persistencia local
│   │
│   ├── features/
│   │   ├── scheduling/                  # Feature de generación de cuadrantes
│   │   │   ├── domain/                  # Entidades, reglas de demanda y álgebra mod-7
│   │   │   ├── application/             # Caso de uso atómico two-phase commit y puertos
│   │   │   ├── infrastructure/          # Repositorio de cuadrantes (LocalScheduleRepository)
│   │   │   └── presentation/            # ScheduleView y ScheduleController
│   │   │
│   │   ├── audit/                       # Feature de auditoría y balance en vivo
│   │   │   ├── domain/                  # auditSchedule puro y AuditReport DTO
│   │   │   └── presentation/            # AuditView (renderizado de tags y tabla de equidad)
│   │   │
│   │   ├── settings/                    # Feature de ajustes de plantilla y demanda
│   │   │   ├── application/             # Puertos de configuración
│   │   │   ├── infrastructure/          # LocalSettingsRepository
│   │   │   └── presentation/            # EmployeeNamesView, DemandView, WeekNavView, SettingsController
│   │   │
│   │   ├── export/                      # Feature de exportación
│   │   │   ├── domain/                  # csv-builder y share-text puros
│   │   │   └── infrastructure/          # Adaptadores: DOM download, Web Share, html2pdf
│   │   │
│   │   └── individual/                  # Feature de vista individual por empleado
│   │       └── presentation/            # IndividualViewPresentation e IndividualController
│   │
│   └── (shims de compatibilidad transitoria: app.js, renderer.js, exporter.js, etc.)
│
└── tests/                               # Suite de pruebas automatizadas (Node.js Test Runner)
    ├── html-contracts.test.js           # Validación de integridad de selectores DOM
    ├── date.test.js                     # Operaciones matemáticas de calendario
    ├── demand-rules.test.js             # Reglas unificadas de demanda
    ├── patterns.test.js                 # Álgebra cíclica mod-7 y modos de turno
    ├── generate-schedules.usecase.test.js # Caso de uso multi-semana con dobles en memoria
    ├── audit.test.js                    # Motor de auditoría y cálculo de balance
    ├── store.test.js                    # Almacenes de clave-valor y aislamiento
    ├── repositories.test.js             # Repositorios de persistencia
    ├── navigation.test.js               # Servicio desacoplado de navegación (pub/sub)
    ├── presentation.test.js             # Vistas de presentación y fachadas
    ├── csv-builder.test.js              # Generación de archivos CSV con BOM UTF-8
    ├── share-text.test.js               # Formateador de horarios para WhatsApp
    └── scheduler.test.js                # Tests de regresión del motor heurístico
```

---

## 🧪 Pruebas Automatizadas y Verificación

La suite de pruebas se ejecuta directamente con el *test runner* nativo de **Node.js** (sin dependencias de empaquetado):

```bash
# Ejecutar suite de pruebas unitarias y de integración (50 tests)
npm test

# Ejecutar verificación estática de tipos con TypeScript (JSDoc)
npm run check
```

---

## 📖 Instrucciones de Uso

1. **Semana de Trabajo**: Selecciona la fecha del lunes de la semana que deseas planificar y el horizonte (1 a 12 semanas).
2. **Plantilla de Empleados**:
   - Ajusta el número de empleados (mínimo 8).
   - Edita los nombres en las tarjetas. El primer empleado actuará como empleado clave en turno de mañana.
   - Configura la semana inicial del ciclo rotativo para cada trabajador si difiere del estándar.
3. **Matriz de Demanda**:
   - Especifica el personal requerido cada día para el turno de **Mañana** y de **Tarde**.
   - Usa el botón `📋 Copiar a todas las semanas` si la demanda es constante.
4. **Generar y Ajustar**:
   - Pulsa **"Generar Cuadrante"**. Si la demanda es factible, se creará el cuadrante semanal.
   - Puedes realizar ajustes manuales en los desplegables (`M`, `T`, `L`); el auditor validará los cambios en tiempo real.
5. **Exportar y Compartir**:
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

### Despliegue en Producción

El proyecto está preparado para plataformas de hosting estático:

- **Netlify**: Incluye [`netlify.toml`](file:///home/d4rkd4y/workspace/turnos/netlify.toml) preconfigurado que ejecuta `npm test` antes del despliegue y aplica cabeceras de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) y políticas de caché óptimas para PWA y assets.
- **Vercel / GitHub Pages**: Compatible directamente publicando la raíz del repositorio.
