# Guía de usuario · Pago Claro

Pago Claro es una demostración de seguimiento de órdenes y pagos asíncronos. El proveedor incluido es **simulado**: no introduce datos de tarjeta ni efectúa cobros reales. Los resultados y la conciliación mostrados corresponden a esa simulación.

## Registro e ingreso

1. Abre la aplicación y selecciona **Regístrate**.
2. Elige un usuario de 3 a 50 caracteres: letras, números, punto, guion o guion bajo. Introduce y confirma una contraseña de 12 a 72 bytes UTF-8.
3. Selecciona **Crear cuenta**. Después del mensaje de confirmación, inicia sesión con esas credenciales.

La cuenta nueva recibe el rol `VIEWER`, con acceso de consulta. Las funciones de gestión requieren que un administrador asigne un rol con el permiso `PAYMENTS_MANAGE`. Para actualizar la interfaz después de un cambio de permisos, cierra sesión y vuelve a entrar. Si el nombre ya existe o la solicitud falla, revisa el mensaje y vuelve a intentarlo. No hay recuperación de contraseña por autoservicio en esta demostración.

## Tablero

El panel **Órdenes y pagos** muestra indicadores, una gráfica de órdenes por fecha y la distribución de los estados de los intentos para los últimos 30 días, en UTC. La hora de actualización indica cuándo se calculó el resumen del servidor, que puede tener desfase: no necesariamente cambia de inmediato al crear una operación. No se suman importes de monedas distintas en las gráficas.

El tablero presenta estados de carga, vacío y error con opción de reintentar. Si se perdió la conexión, no se deben interpretar los guiones como ceros.

## Consultar órdenes

1. En **Todas las órdenes**, busca por referencia o selecciona un estado. El filtro se aplica al conjunto del servidor.
2. Selecciona cuántos registros mostrar, usa las flechas o escribe el número de página y confirma con Enter o saliendo del campo.
3. Selecciona una orden para consultar sus datos, intentos e historial. El detalle se actualiza periódicamente mientras está abierto; también puedes usar su botón de actualización.

Si no hay resultados, cambia la búsqueda o el filtro. Una orden seleccionada muestra el historial y los intentos en páginas con tamaño seleccionable. Los estados pendientes o por confirmar no deben interpretarse como aprobados.

## Crear una orden e iniciar un intento

**Permiso necesario:** `PAYMENTS_MANAGE`.

1. Selecciona **Nueva orden**, introduce una referencia, un importe positivo y su moneda y confirma.
2. Abre la orden y selecciona **Iniciar pago**. El intento comienza pendiente en el proveedor simulado.
3. Consulta el estado en el detalle. Mientras exista un intento pendiente, incierto o aprobado, no se ofrece iniciar otro para esa orden.

Si se interrumpe la solicitud de inicio, volver a intentarla desde la misma sesión conserva su clave de idempotencia. Si cierras la pestaña antes de confirmar el resultado, consulta la orden antes de repetir la acción: la clave local no persiste entre sesiones. Los mensajes de error indican cuándo reintentar; no suponen que un pago incierto haya fallado.

## Consultar un pago pendiente o incierto

**Permiso necesario:** `PAYMENTS_MANAGE`.

En el detalle de una orden, selecciona **Consultar al proveedor** en un intento pendiente o por confirmar. La aplicación pide al backend conciliar con el proveedor simulado y actualiza el detalle y el historial. El resultado puede permanecer pendiente si el proveedor simulado todavía no tiene un resultado definitivo. Para cambiar su estado en una demostración controlada se usa la API administrativa documentada en el backend; la interfaz no presenta ese cambio como un pago real.

## Usuarios, roles y permisos

**Acceso necesario:** rol `ADMIN`.

En **Usuarios y roles**, crea usuarios, crea roles seleccionando permisos y asigna o retira roles de los usuarios. Las listas incluyen paginación y tamaño de página. Los usuarios recién creados necesitan un rol apropiado para acceder. El backend evita que un administrador se quite su propio rol `ADMIN`. No existe edición de permisos de un rol ya creado ni desactivación de usuarios en la interfaz actual.

## Apariencia e idioma

Usa los selectores de la parte superior para escoger el tema claro, oscuro o el del sistema, y el idioma: español, inglés, portugués, alemán, francés, japonés o chino simplificado. Las preferencias se guardan en el navegador. El tema del sistema se actualiza si cambia la preferencia del dispositivo. Cambiar el idioma recarga la interfaz y adapta los formatos de fechas, números y moneda.

## Cerrar sesión

Usa el botón con el icono de salida. El token de la pestaña se elimina. Para entornos reales debe revisarse el modelo de sesión descrito en el README del frontend.
