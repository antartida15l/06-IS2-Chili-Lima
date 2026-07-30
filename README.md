# Préstamos de Equipos — IS II · Ficha 06

Miniaplicación estática para la actividad individual de aseguramiento de calidad de software.
No usa base de datos ni servidor; guarda los registros en el navegador mediante `localStorage`.

---

## Datos del estudiante

| Campo | Detalle |
|---|---|
| **Nombre** | [Tu nombre completo] |
| **Número en lista** | 06 |
| **Ficha asignada** | 06 — Préstamos solo en días hábiles |
| **Repositorio** | `https://github.com/TU-USUARIO/06-IS2-apellidopaterno-apellidomaterno` |
| **GitHub Pages** | `https://TU-USUARIO.github.io/06-IS2-apellidopaterno-apellidomaterno/` |

> Reemplace `TU-USUARIO` y los apellidos por sus datos reales antes de entregar.

---

## Mejora implementada — Ficha 06

**Nombre de la mejora:** Préstamos solo en días hábiles

**Descripción:**
Impedir que el sistema registre un préstamo cuya fecha de inicio corresponda a un sábado o domingo. Cuando el usuario selecciona una fecha de fin de semana (ya sea en el campo de fecha o al hacer clic en "Registrar préstamo"), el sistema **rechaza explícitamente** la fecha, mostrando una ventana flotante centrada que indica el nombre exacto del día no válido, y **no guarda ningún registro**. Recién después de ese rechazo, el sistema ofrece —como acción opcional del usuario— pasar la fecha al siguiente día hábil disponible; si el usuario no lo acepta, el campo queda vacío para que elija otra fecha manualmente. En ningún caso la fecha se corrige sola sin que el usuario lo confirme.

**Criterios de aceptación:**

| # | Condición | Comportamiento esperado |
|---|---|---|
| CA-01 | Fecha de préstamo es lunes, martes, miércoles, jueves o viernes | El sistema acepta el registro y lo guarda correctamente. |
| CA-02 | Fecha de préstamo es sábado o domingo | El sistema rechaza el registro, muestra un mensaje con el nombre del día y no agrega ninguna fila a la tabla. |

**Archivos modificados:**

| Archivo | Cambio realizado |
|---|---|
| `app.js` | Funciones `esDiaHabil()` y `nombreDia()`, más validación dentro del evento `submit` y del evento `change` del campo de fecha. Se agregó `handleWeekendLoanDate()`, que primero muestra el rechazo exacto y solo después ofrece pasar al siguiente día hábil mediante confirmación explícita del usuario. Se reemplazó el sistema de notificaciones (toasts de esquina) por un sistema único de diálogos centrados (`showDialog` / `notify`), usado también para la confirmación de devolución y el restablecimiento de datos. |
| `index.html` | Badge "Solo días hábiles" en el encabezado; etiqueta "Lun – Vie" en el campo de fecha; los campos de fecha de préstamo y devolución se reorganizaron en formato de línea de tiempo apilada (uno encima del otro) en lugar de dos columnas; se agregó el contenedor de error inline del solicitante. |
| `style.css` | Rediseño completo con paleta morado · fucsia · negro · blanco; estilos del nuevo sistema de diálogos centrados (`.dialog-overlay`, `.dialog`); estilos del bloque `.date-stack` (línea de tiempo con conector punteado y nodos) para la sección de fechas; se retiraron los estilos del toast lateral y del modal antiguo, unificados en el nuevo componente de diálogo. |

---

## Mejoras adicionales de experiencia de usuario (UX)

Estas mejoras acompañan a la mejora funcional de la Ficha 06 sin alterar su comportamiento evaluado (rechazo de fines de semana): son cambios de presentación y usabilidad.

1. **Mensajes en ventana flotante centrada:** todos los mensajes del sistema (errores, éxitos, avisos y confirmaciones) dejaron de mostrarse como notificaciones en la esquina de la pantalla y ahora aparecen como una ventana modal centrada, con overlay oscuro, título, icono según el tipo de mensaje y botón(es) de acción.
2. **Rechazo primero, oferta de solución después:** al elegir una fecha de fin de semana, el sistema primero informa con precisión qué fecha y qué día fue rechazado. Solo en un segundo paso —dentro del mismo diálogo— se le pregunta al usuario "¿Deseas pasar al siguiente día hábil?", con opción de aceptar o de elegir otra fecha manualmente. Nada se cambia de forma automática o silenciosa.
3. **Fechas en línea de tiempo apilada:** los campos "Fecha de préstamo" y "Devolución prevista" se muestran uno encima del otro dentro de una tarjeta con un conector visual (línea punteada y nodos), en vez de dos columnas una junto a otra. Mejora la lectura del flujo préstamo → devolución, especialmente en pantallas angostas.
4. **Validación de nombre en tiempo real:** el campo "Solicitante" bloquea caracteres no permitidos mientras se escribe (no se pueden ingresar números ni símbolos), mostrando un mensaje inline específico según el tipo de error (por ejemplo, distingue si el problema fue un número o un símbolo no permitido).

---

## Cómo funciona la validación de días hábiles (explicación técnica)

Cuando el usuario cambia la fecha de préstamo o envía el formulario, la función `esDiaHabil(fechaISO)` recibe la fecha en formato `YYYY-MM-DD`, crea un objeto `Date` con hora `T00:00:00` para evitar desfases de zona horaria, y consulta `getDay()`. Si el resultado es `0` (domingo) o `6` (sábado), la función retorna `false` y se invoca `handleWeekendLoanDate()`, que muestra el diálogo de rechazo con el nombre completo del día (obtenido mediante `nombreDia()`) y la fecha formateada. El registro **no se guarda** hasta que el usuario elige explícitamente una fecha hábil, ya sea escribiéndola de nuevo o aceptando la sugerencia del siguiente día hábil ofrecida en el mismo diálogo.

```js
function esDiaHabil(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const dia = fecha.getDay(); // 0 = domingo, 6 = sábado
  return dia !== 0 && dia !== 6;
}

function handleWeekendLoanDate(fechaISO) {
  const dia = capitalize(nombreDia(fechaISO));
  const siguienteHabil = getNextBusinessFrom(fechaISO);

  showDialog({
    type: "warning",
    title: "Fecha no válida",
    message: `La fecha de préstamo seleccionada (${dia} ${formatDate(fechaISO)}) no es un día hábil. Solo se permiten préstamos de lunes a viernes.`,
    buttons: [
      { label: "Elegir otra fecha" },
      { label: `Sí, usar ${capitalize(nombreDia(siguienteHabil))} ${formatDate(siguienteHabil)}`, primary: true }
    ]
  });
}
```

---

## Funcionalidad base (sin modificar en su comportamiento)

- Registra un préstamo de un equipo disponible del catálogo.
- Evita registrar datos incompletos.
- Evita que la fecha de devolución sea anterior a la fecha de préstamo.
- Controla que un equipo activo no pueda prestarse dos veces.
- Permite registrar la devolución de un equipo (ahora con confirmación en ventana centrada).
- Conserva todos los datos en el navegador con `localStorage`.

---

## Inicio rápido

1. Clone o descargue el repositorio.
2. Abra `index.html` en cualquier navegador moderno (doble clic o arrastre al navegador).
   _No se requiere servidor, instalar dependencias ni conexión a internet._
3. Pruebe **CP-01**: seleccione una fecha de lunes a viernes → el préstamo debe registrarse.
4. Pruebe **CP-02**: seleccione una fecha de sábado o domingo → debe aparecer el diálogo de rechazo, con la opción de pasar al siguiente día hábil.

---

## Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Estructura HTML de la aplicación |
| `style.css` | Diseño visual (paleta morado · fucsia · negro · blanco) |
| `app.js` | Lógica, validaciones, diálogos centrados y almacenamiento local |
| `README.md` | Documentación y casos de prueba |

---

## Casos de prueba de mi mejora (Ficha 06)

| Caso | Datos de entrada / acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| **CP-01: válido** | Equipo: Laptop Lenovo (EQ-01). Solicitante: Ana Quispe. Fecha de préstamo: **28/07/2026 (lunes)**. Fecha de devolución: 31/07/2026. Acción: clic en "Registrar préstamo". | El sistema debe aceptar la fecha de lunes, guardar el préstamo y mostrarlo en la tabla con estado **Activo**. El contador debe incrementar a 1 activo. | El préstamo "Laptop Lenovo — Ana Quispe" apareció en la tabla con estado Activo y el contador mostró 1 activo. El sistema mostró una ventana centrada de confirmación indicando que el registro fue exitoso. | ✅ Aprobado |
| **CP-02: inválido/límite** | Equipo: Laptop HP (EQ-02). Solicitante: Carlos Mamani. Fecha de préstamo: **26/07/2026 (sábado)**. Fecha de devolución: 29/07/2026. Acción: clic en "Registrar préstamo". | El sistema debe rechazar la fecha de sábado, mostrar un mensaje indicando que ese día no es hábil y no agregar ninguna fila a la tabla. | Apareció una ventana centrada con el mensaje **"La fecha de préstamo seleccionada (Sábado 26 jul. 2026) no es un día hábil. Solo se permiten préstamos de lunes a viernes."**, con la opción adicional de pasar al siguiente día hábil (lunes 27/07/2026). Al no aceptarla, la tabla no registró el préstamo y el contador permaneció sin cambios. | ✅ Aprobado |

---

## Plantilla obligatoria de pruebas (formato del curso)

| Caso | Datos de entrada / acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| CP-01: válido | Ver fila CP-01 de la tabla anterior | Ver fila CP-01 de la tabla anterior | Ver fila CP-01 de la tabla anterior | Aprobado |
| CP-02: inválido, límite o cancelación | Ver fila CP-02 de la tabla anterior | Ver fila CP-02 de la tabla anterior | Ver fila CP-02 de la tabla anterior | Aprobado |

---

## Ficha asignada (referencia del curso)

**Ficha 06 — Préstamos solo en días hábiles**

- **Mejora asignada:** Impedir registrar préstamos cuya fecha inicial sea sábado o domingo.
- **Criterios de aceptación:** Una fecha de lunes a viernes se registra; una fecha de fin de semana se rechaza.
- **CP-01 (válido):** Registrar una fecha de lunes a viernes se registra.
- **CP-02 (inválido/límite/cancelación):** una fecha de fin de semana se rechaza.

---

## Entregables de la actividad

| Entregable | Contenido mínimo |
|---|---|
| Repositorio individual | Código de la miniaplicación y `README.md` actualizado. |
| Aplicación publicada | URL de GitHub Pages funcional. |
| Dos casos de prueba | En este `README.md`: acción o datos, resultado esperado, resultado obtenido y estado. |
| Informe técnico impreso | Nombre del estudiante y número de ficha, nombre de la mejora, criterios de aceptación, resumen de CP-01 y CP-02, resultado de cada prueba (aprobado/fallido), URL del repositorio y de GitHub Pages, rúbrica de evaluación. |

> Cada estudiante debe crear su propio repositorio y subir allí los archivos antes de publicar.

---

## Rúbrica de evaluación

| Criterio | Evidencia | Pts |
|---|---|---|
| Mejora funcional implementada | Validación activa en `app.js`; no daña la función base. | 4.0 |
| Pruebas documentadas | CP-01 y CP-02 completos con datos, resultado esperado, resultado obtenido y estado. | 2.0 |
| README y trazabilidad | Este archivo con instrucciones, tabla de pruebas y enlaces al repositorio y Pages. | 1.0 |
| Código y usabilidad | Cambios comprensibles, mensaje de error claro con nombre del día, interfaz funcional. | 1.5 |
| Despliegue GitHub Pages | URL funcional donde se puede probar la mejora directamente. | 1.5 |
| **Total** | | **10.0 / 20** _(escala docente)_ |

---

_Actividad individual · Ficha 06 · Ingeniería de Software II_
