# Casos de uso · Pago Claro

Los casos describen el comportamiento de la demostración y sus permisos. La pasarela y la conciliación se ejecutan contra un proveedor simulado.

## CU-01 · Registrar cuenta

- **Actor y precondiciones:** visitante en la pantalla de ingreso; el servicio está disponible.
- **Flujo:** selecciona registro; introduce usuario válido y contraseña; confirma; envía el formulario.
- **Resultado:** se crea una cuenta `USER` con acceso de consulta; el visitante vuelve al ingreso e inicia sesión por separado.
- **Alternativas:** usuario duplicado, datos inválidos o fallo de conexión producen un mensaje; no se inicia sesión automáticamente.

## CU-02 · Iniciar y cerrar sesión

- **Actor y precondiciones:** usuario activo con credenciales válidas.
- **Flujo:** introduce usuario y contraseña; abre la consola. Al terminar, selecciona cerrar sesión.
- **Resultado:** la interfaz utiliza el token de la sesión y lo elimina al cerrar sesión.
- **Alternativas:** credenciales inválidas o un servicio no disponible muestran un error; los permisos del backend prevalecen sobre los controles visibles.

## CU-03 · Revisar actividad y consultar órdenes

- **Actor y precondiciones:** usuario con `PAYMENTS_READ` o `PAYMENTS_MANAGE`.
- **Flujo:** abre el tablero; revisa los últimos 30 días; busca referencia, selecciona estado, tamaño y página; abre una orden.
- **Resultado:** se muestran métricas agregadas, página de resultados, pagos e historial disponibles. El resumen tiene la fecha de su última actualización y puede presentar desfase.
- **Alternativas:** no hay datos o coincidencias; se presenta un estado vacío. Una falla ofrece reintento; una orden seleccionada conserva su detalle mientras se actualiza.

## CU-04 · Crear orden e iniciar pago

- **Actor y precondiciones:** usuario con `PAYMENTS_MANAGE`; referencia, valor y moneda válidos; para iniciar, la orden debe admitir un intento.
- **Flujo:** crea orden con una referencia, valor y moneda; el valor se agrupa automáticamente según el idioma; abre detalle; inicia pago; consulta estado e historial.
- **Resultado:** queda registrado un intento pendiente del proveedor simulado. La orden solo se marca pagada cuando se confirma aprobación.
- **Alternativas:** referencia duplicada, orden incompatible o fallo de red presentan error. Al reintentar tras incertidumbre de red en la misma sesión se reutiliza la clave del intento.

## CU-05 · Conciliar intento

- **Actor y precondiciones:** usuario con `PAYMENTS_MANAGE`; intento pendiente o por confirmar.
- **Flujo:** abre detalle y solicita consultar el proveedor.
- **Resultado:** el servidor consulta al proveedor simulado y aplica una transición válida; el detalle y el historial muestran lo registrado.
- **Alternativas:** el proveedor sigue pendiente, o falla la solicitud: se conserva el estado que reporte el servidor y se informa el error; no se inventa un resultado.

## CU-06 · Administrar accesos

- **Actor y precondiciones:** usuario con rol `ADMIN`.
- **Flujo:** crea un usuario con un rol; busca usuarios por nombre; elige un solo rol por usuario; consulta el catálogo y edita los permisos de cada rol.
- **Resultado:** el servidor guarda la asignación y los permisos. El usuario afectado vuelve a iniciar sesión para que la interfaz refleje los cambios.
- **Alternativas:** conflictos, permiso insuficiente o datos inválidos se informan. No se permite quitar el rol `ADMIN` propio ni dejar el sistema sin administradores; `ADMIN` conserva el permiso de gestión.

## CU-07 · Adaptar la experiencia

- **Actor y precondiciones:** usuario con acceso a la aplicación.
- **Flujo:** selecciona el idioma y el tema claro, oscuro o del sistema. En móvil abre el menú de navegación para acceder a estas opciones.
- **Resultado:** la preferencia se guarda en el navegador y la interfaz adapta los textos y formatos disponibles.
- **Alternativas:** si cambia el tema del dispositivo y está elegida la opción del sistema, la interfaz se actualiza automáticamente.
