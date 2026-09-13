# 📅 Gestión de Turnos Laborales

Aplicación web (SPA) para la **planificación, generación automática y exportación de cuadrantes de turnos laborales semanales**. Diseñada para comercios, hostelería, pastelerías o pymes que operan con turnos de Mañana y Tarde.

Funciona íntegramente en el navegador (100% client-side), sin necesidad de bases de datos ni backend, y con persistencia automática en `localStorage`.

---

## 🚀 Características Principales

- **Asignación Heurística Inteligente**: Algoritmo que distribuye descansos y turnos respetando la capacidad del equipo y la demanda de cada día.
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
  - **Empleado 1 (Mar)**: trabaja exclusivamente **5 turnos de Mañana y 0 de Tarde** todas las semanas.
  - El algoritmo asegura mediante holgura por prioridad y fases de reparación el cumplimiento del 100% de los turnos objetivo de cada empleado.
- **Reglas y Restricciones Duras**:
  - **Dotación Mínima**: Nunca puede haber menos de **2 empleados por turno** en ningún día de la semana.
  - **Fines de Semana Reforzados**: Los **viernes, sábados y domingos** siempre cuentan obligatoriamente con **3 empleados por cada turno** (3 Mañanas + 3 Tardes = 6 trabajadores en activo y exactamente 2 descansando).
  - **Empleado Clave (Empleado 1 - Mar)**: Trabaja exclusivamente en turno de **Mañana** en sus 5 días laborables (5M / 0T) y libra según su semana correspondiente del ciclo rotativo.
  - **Días Libres Consecutivos**: Cada empleado disfruta estrictamente de **2 días libres semanales seguidos** (`L`).
  - **Mínimo 1 Mañana por Empleado**: Todos los empleados tienen garantizado al menos **1 turno de Mañana** a la semana.
- **Optimización Ergonómica de Descanso**:
  - Reduce al mínimo las secuencias fatigosas de **Tarde seguida de Mañana** (`T -> M`).
  - Realiza intercambios recíprocos entre trabajadores que preservan de forma exacta los totales de mañana y tarde de cada trabajador.
- **Auditoría y Balance en Vivo**:
  - Supervisión en tiempo real del cumplimiento de demanda diaria, garantía de mañanas, 2 días libres seguidos, correspondencia con el patrón rotativo (`[Sem.X]`) y cumplimiento de la alternancia de turnos (`3M / 2T ✅` o `2M / 3T ✅`).
- **Cuadrante Visual por Turnos**:
  - Columnas organizadas con el **Día y la Fecha del calendario** (Lunes a Domingo con día y mes).
  - Filas fijas para cada turno: **Mañana**, **Tarde** y **Libre**.
  - En cada celda se muestra la **lista de empleados** que trabajan en ese turno o disfrutan de su día libre.
  - Cada empleado cuenta con selector rápido para permitir reasignaciones manuales instantáneas.
- **Exportación a PDF Profesional**:
  - Genera un documento en formato A4 apaisado (*landscape*) reflejando fielmente la tabla de turnos por día y fecha, utilizando `html2pdf.js`.
- **Persistencia en LocalStorage**:
  - Guarda automáticamente nombres de empleados, fechas, matriz de demanda, patrón rotativo de cada trabajador, modos de turno y todas las semanas generadas.
- **Diseño SaaS Responsivo**:
  - Interfaz limpia, accesible y adaptada tanto a escritorio como a dispositivos móviles.

---

## 📋 Reglas del Motor de Planificación

El motor (`Scheduler` en [`app.js`](file:///Users/mario/workspace/turnos/app.js)) opera en 4 fases:

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

```
.
├── index.html        # Estructura semántica de la SPA y plantilla para PDF
├── app.js            # Lógica completa: Storage, Scheduler, Renderer, Exporter y App
├── style.css         # Estilos, variables CSS, componentes y estilos de impresión
└── README.md         # Documentación del proyecto
```

---

## 📖 Instrucciones de Uso

1. **Semana de Trabajo**: Selecciona la fecha del lunes de la semana que deseas planificar.
2. **Plantilla de Empleados**:
   - Define el número de empleados (mínimo 8).
   - Edita los nombres en las tarjetas correspondientes. El primer empleado actuará como empleado clave de turno de mañana.
3. **Matriz de Demanda**:
   - Especifica cuántos trabajadores se requieren cada día de la semana (Lunes a Domingo) para el turno de **Mañana** y para el turno de **Tarde**.
4. **Generar Cuadrante**:
   - Pulsa el botón **"Generar Cuadrante"**. Si la demanda es factible, se mostrará el cuadrante semanal.
5. **Ajustes Manuales**:
   - En la tabla de resultados puedes cambiar cualquier turno (`M`, `T` o `L`) mediante los desplegables. Los cambios se sincronizan en directo.
6. **Exportar**:
   - Pulsa **"Exportar a PDF"** para descargar el cuadrante listo para imprimir o enviar.
   - Pulsa **"Volver a Configurar"** si necesitas cambiar demandas o nombres.

---

## 🚢 Despliegue y Ejecución Local

Al ser un proyecto frontend estático sin dependencias de compilación ni empaquetadores (no requiere `npm install` ni `webpack`), se puede ejecutar de cualquiera de las siguientes formas:

### Ejecución Local

- **Directamente en el navegador**: Abre el archivo `index.html` con cualquier navegador web moderno (Chrome, Firefox, Edge, Safari).
- **Con servidor HTTP de Python**:
  ```bash
  python3 -m http.server 8000
  ```
  Accede a `http://localhost:8000` en tu navegador.
- **Con Node.js (`npx serve`)**:
  ```bash
  npx serve .
  ```
- **Con la extensión Live Server** en VS Code.

### Despliegue en Producción

Puedes desplegar la aplicación en segundos en cualquier proveedor estático:

- **Netlify**: Arrastra y suelta la carpeta del proyecto en el panel de Netlify Drop, o conecta tu repositorio de GitHub.
- **GitHub Pages**: Ve a *Settings > Pages* de tu repositorio y selecciona la rama `main` en la carpeta raíz `/`.
- **Vercel**: Importa el repositorio sin ningún comando de build.
- **Servidor Nginx / Apache**: Copia los archivos `index.html`, `app.js` y `style.css` en el directorio público del servidor (por ejemplo `/var/www/html/`).

---

## 🛠️ Tecnologías

- **HTML5**: Marcado semántico y accesible.
- **CSS3**: Variables CSS nativas, Flexbox, CSS Grid y media queries para impresión y responsive.
- **JavaScript (Vanilla ES6+)**: Arquitectura modular orientada a objetos simples (`Storage`, `Scheduler`, `Renderer`, `Exporter`).
- **html2pdf.js v0.10.1**: Renderizado y exportación cliente a PDF en formato apaisado.
