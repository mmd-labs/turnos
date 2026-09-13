# 📅 Gestión de Turnos Laborales

Aplicación web (SPA) para la **planificación, generación automática y exportación de cuadrantes de turnos laborales semanales**. Diseñada para comercios, hostelería, pastelerías o pymes que operan con turnos de Mañana y Tarde.

Funciona íntegramente en el navegador (100% client-side), sin necesidad de bases de datos ni backend, y con persistencia automática en `localStorage`.

---

## 🚀 Características Principales

- **Asignación Heurística Inteligente**: Algoritmo que distribuye descansos y turnos respetando la capacidad del equipo y la demanda de cada día.
- **Reglas y Restricciones Duras**:
  - Empleado clave (Empleado 1): trabaja exclusivamente en turno de **Mañana** y libra en 2 días consecutivos de menor demanda semanal.
  - Empleado 2 y resto de la plantilla: rotan entre turnos de **Mañana** y **Tarde** con la misma lógica general.
  - Cada empleado disfruta estrictamente de **2 días libres semanales seguidos** (`L`) (ej. Lun-Mar, Mar-Mié, ..., Sáb-Dom, Dom-Lun).
  - **Mínimo 1 Mañana por Empleado**: Todos los empleados tienen garantizado al menos **1 turno de Mañana** a la semana.
- **Optimización Ergonómica de Descanso**:
  - Reduce al mínimo las secuencias fatigosas de **Tarde seguida de Mañana** (`T -> M`).
  - Realiza intercambios exclusivos entre turnos de trabajo (`M` $\leftrightarrow$ `T`), garantizando que ningún trabajador pierda o gane días libres en la optimización ni se quede sin su turno de mañana mínimo.
- **Auditoría y Balance en Vivo**:
  - Supervisión en tiempo real del cumplimiento de demanda diaria, garantía de mañanas, 2 días libres y consecutividad de libranza (`⚠️ No seguidos`).
- **Cuadrante Visual por Turnos**:
  - Columnas organizadas con el **Día y la Fecha del calendario** (Lunes a Domingo con día y mes).
  - Filas fijas para cada turno: **Mañana**, **Tarde** y **Libre**.
  - En cada celda se muestra la **lista de empleados** que trabajan en ese turno o disfrutan de su día libre.
  - Cada empleado cuenta con selector rápido para permitir reasignaciones manuales instantáneas.
- **Exportación a PDF Profesional**:
  - Genera un documento en formato A4 apaisado (*landscape*) reflejando fielmente la tabla de turnos por día y fecha, utilizando `html2pdf.js`.
- **Persistencia en LocalStorage**:
  - Guarda automáticamente nombres de empleados, fechas, matriz de demanda y el último cuadrante generado.
- **Diseño SaaS Responsivo**:
  - Interfaz limpia, accesible y adaptada tanto a escritorio como a dispositivos móviles.

---

## 📋 Reglas del Motor de Planificación

El motor (`Scheduler` en [`app.js`](file:///Users/mario/workspace/turnos/app.js)) opera en 4 fases:

1. **Validaciones de Capacidad**:
   - **Capacidad Total**: La demanda total de la semana no puede superar la capacidad máxima disponible ($\text{Empleados} \times 5$ días laborables).
   - **Capacidad Diaria**: En ningún día la demanda $(\text{Mañana} + \text{Tarde})$ puede superar la plantilla total de empleados.
   - **Capacidad de Mañanas**: La demanda total de mañanas debe ser suficiente para cubrir las 5 mañanas del Empleado 1 y al menos 1 mañana para cada uno de los restantes $N - 1$ empleados ($\text{Demanda Mañanas} \ge N + 4$).
2. **Fase 1 (Empleado Clave 1)**:
   - Evalúa todos los pares de días libres consecutivos y selecciona el de menor demanda combinada que permita trabajar en mañanas en sus 5 días laborables.
   - En sus 5 días laborables restantes, se le asigna exclusivamente turno de Mañana (`M`).
3. **Fase 2 (Distribución de Días Libres Consecutivos)**:
   - Para los empleados restantes (Empleados 2 a N), asigna pares consecutivos de libranza (`[Lun-Mar]`, `[Mar-Mié]`, `[Mié-Jue]`, `[Jue-Vie]`, `[Vie-Sáb]`, `[Sáb-Dom]`, `[Dom-Lun]`) optimizando la cobertura de la holgura diaria mediante búsqueda branch-and-bound.
4. **Fase 3 (Asignación de Turnos Mañana/Tarde y Mínimo Garantizado)**:
   - Contabiliza con precisión los turnos de mañana ya cubiertos por el empleado clave.
   - Asigna los turnos restantes (`M` y `T`) priorizando a quienes aún no tienen turno de mañana y balanceando la carga acumulada.
   - Aplica un paso de garantía estricta para asegurar que **todos los empleados tengan al menos 1 turno de mañana**.
5. **Fase 4 (Optimización Ergonómica)**:
   - Detecta transiciones perjudiciales `T -> M` entre días consecutivos.
   - Ejecuta intercambios entre trabajadores en el mismo día preservando invariantes: la demanda diaria se mantiene exacta, cada trabajador mantiene sus 2 días libres consecutivos y nadie pierde su turno de mañana mínimo.

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
