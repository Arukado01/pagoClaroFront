# Pago Claro · Frontend

Consola React y TypeScript para crear órdenes, iniciar intentos de pago y consultar su estado asíncrono. Es una implementación de apoyo al diseño técnico: no cobra dinero ni integra una pasarela real por sí sola.

## Requisitos

Node.js 20.19+ o 22.12+, npm y el backend de este proyecto. La aplicación utiliza JWT entregado por el backend; el usuario inicial se configura allí mediante variables de entorno. No hay credenciales incluidas en el código.

## Desarrollo

```sh
npm ci
npm run dev
```

Abre `http://localhost:5173`. Sin configuración adicional, Vite reenvía `/api` a `http://localhost:8080`. Para usar otro servidor, copia `.env.example` a `.env.local` y define `VITE_API_BASE_URL` como el **origen** del backend, sin `/api` y sin barra final. El backend debe permitir el origen del frontend en su configuración CORS.

## Producción

```sh
npm ci
npm test
npm run build
```

La salida estática queda en `dist/`. `VITE_API_BASE_URL` se incorpora durante la compilación: si se deja vacía, el servidor público debe enviar `/api/*` al backend y servir el resto desde el frontend. Si se establece un origen distinto, debe ser HTTPS y estar permitido por CORS. Nunca se deben colocar secretos en variables `VITE_`: son públicas en el navegador.

También se incluye `Dockerfile` para servir `dist/` con nginx en el puerto 80. Ejemplo:

```sh
docker build --build-arg VITE_API_BASE_URL=https://api.ejemplo.com -t pago-claro-front .
docker run --rm -p 8081:80 pago-claro-front
```

El proxy de `/api` corresponde al enrutador o balanceador externo; el contenedor del frontend solo sirve archivos estáticos.

## Comportamiento

- Registro autoservicio con rol de consulta `VIEWER`, inicio y cierre de sesión; el token se guarda en `sessionStorage` hasta cerrar la pestaña o la sesión. Este enfoque de demostración expone el token a JavaScript: para producción se recomienda evaluar cookies `HttpOnly`, `Secure`, `SameSite` y protección CSRF apropiada.
- Creación y búsqueda de órdenes, estado de pago, detalle e historial de intentos. El detalle se actualiza cada 15 segundos mientras está abierto.
- Al iniciar un intento se genera una clave de idempotencia, conservada en la sesión si la solicitud falla, para que un nuevo intento del usuario reutilice la misma clave. La garantía definitiva reside en el backend y el proveedor; perder la sesión hace perder esta clave local.
- Un usuario ADMIN puede crear usuarios y roles, consultar permisos y asignar o quitar roles. La autorización se verifica en el backend.
- Estados de carga con esqueletos, vacío, error y confirmación. La interfaz no presume que una solicitud pendiente o incierta haya sido aprobada.
- Diseño adaptable con componentes shadcn/ui, controles con etiquetas, foco visible y soporte de movimiento reducido. Incluye temas claro, oscuro y automático, además de siete idiomas con formatos regionales.
- Tablero agregado de los últimos 30 días, calculado por el backend con actualización periódica y fecha visible de corte, paginación de órdenes, intentos e historial, y conciliación manual con el proveedor simulado. Consulta [la guía](docs/guia-usuario.md) y [los casos de uso](docs/casos-de-uso.md).

## Límites

El proveedor incluido en el backend es simulado; no se deben introducir datos reales de tarjetas. Los cambios de permisos requieren volver a iniciar sesión para actualizar los controles de interfaz; el backend sigue validando cada solicitud. La interfaz no permite editar permisos de un rol ya creado ni desactivar usuarios; son extensiones pendientes. La configuración de HTTPS, cabeceras de seguridad, política CSP, expiración/renovación y almacenamiento de sesión aptos para producción requieren revisión antes de manejar pagos reales.
