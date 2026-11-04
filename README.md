# Pago Claro | Frontend

Consola web para consultar órdenes, seguir intentos de pago y administrar accesos. Forma parte de la solución de integración asíncrona descrita en la prueba técnica: el backend usa un proveedor **simulado**, por lo que la aplicación no procesa dinero ni debe recibir datos reales de tarjeta.

[Abrir la plataforma](https://d2ptzxtlhkwxzt.cloudfront.net) · [Documentación interactiva de la API](https://d2ptzxtlhkwxzt.cloudfront.net/swagger-ui/index.html)

## Proyectos y documentación

- [Backend y diseño técnico](https://github.com/Arukado01/pagoClaroBack): API Spring, migraciones y base de datos.
- [Guía de usuario en PDF](docs/Guia_de_usuario.pdf): instrucciones para operar la plataforma.
- [Casos de uso en PDF](docs/Casos_de_uso.pdf): actores, precondiciones, flujos y resultados.
- [Guía de usuario editable](docs/guia-usuario.md) y [casos de uso editables](docs/casos-de-uso.md).

## Funcionalidades

- Registro de usuarios de consulta, inicio y cierre de sesión con JWT. Cada usuario tiene un único rol; un administrador puede crear usuarios y roles, cambiar el rol asignado y administrar los permisos de cada rol.
- Tablero de los últimos 30 días con gráficas de órdenes e intentos. Los datos provienen de agregaciones del backend y muestran su última actualización; no se suman valores de distintas monedas.
- Búsqueda y filtros de órdenes con paginación del servidor. Los intentos, eventos de auditoría, usuarios y roles también incluyen paginación.
- La administración permite buscar usuarios por nombre antes de paginar los resultados; cada usuario conserva un solo rol.
- Creación de órdenes, inicio idempotente de intentos, seguimiento de estados y conciliación manual contra el proveedor simulado. Las acciones disponibles dependen de los permisos; el backend verifica cada solicitud.
- Diseño adaptable con componentes shadcn/ui, estados de carga con esqueletos, mensajes de error y vacío, etiquetas accesibles y foco visible. Incluye tema claro, oscuro o del sistema y siete idiomas: español, inglés, portugués, alemán, francés, japonés y chino simplificado.
- La barra superior permanece visible al desplazar el contenido. En escritorio, la navegación lateral puede contraerse; en móvil, un menú ofrece las opciones de navegación y preferencias.
- El valor de una orden se introduce con separadores acordes al idioma seleccionado y se valida antes de enviarse; el servidor recibe el valor numérico, no el texto formateado.

## Tecnologías

| Área | Herramientas |
| --- | --- |
| Interfaz | React, TypeScript y Vite |
| Componentes | shadcn/ui, Radix UI, Tailwind CSS y Lucide |
| Pruebas | Vitest y Testing Library |
| Distribución | Nginx en Docker y GitHub Actions |

## Requisitos

- Node.js 20.19+ o 22.12+ y npm.
- API de [pagoClaroBack](https://github.com/Arukado01/pagoClaroBack) en ejecución. Su README explica cómo iniciar PostgreSQL y Spring con Docker Compose.
- Docker Engine y Compose, solo si se desea construir la imagen del frontend o iniciar el backend mediante contenedores.

## Ejecutar en desarrollo

1. Inicia el backend en `http://localhost:8080` siguiendo sus instrucciones. Configura allí el usuario administrador inicial o utiliza el registro de la aplicación para crear una cuenta de consulta.
2. Desde la raíz de este repositorio ejecuta:

   ```sh
   npm ci
   npm run dev
   ```

3. Abre `http://localhost:5173`. Vite envía las solicitudes `/api` al backend local por defecto.

Para otro backend, copia `.env.example` como `.env.local` y define `VITE_API_BASE_URL` con su **origen**, por ejemplo `https://api.ejemplo.com`, sin `/api` ni barra final. El backend debe permitir el origen del navegador en `CORS_ORIGIN`. Las variables `VITE_` quedan incluidas en el código entregado al navegador: nunca guardes secretos en ellas.

## Comprobaciones y compilación

```sh
npm test             # pruebas de interfaz
npm run typecheck    # TypeScript sin generar archivos
npm run build        # typecheck y compilación en dist/
```

Las pruebas cubren preferencias, formato de valores, navegación móvil, renderizado de métricas, errores y selección de órdenes con respuestas fuera de orden. Para validar la integración completa se necesita el backend y una base PostgreSQL; consulta la prueba de integración descrita en su README.

Para construir y servir la interfaz con Docker:

```sh
docker build --build-arg VITE_API_BASE_URL=https://api.ejemplo.com -t pago-claro-front .
docker run --rm -p 8081:80 pago-claro-front
```

El contenedor sirve únicamente archivos estáticos. Si `VITE_API_BASE_URL` se deja vacía, un proxy externo debe dirigir `/api/*` a la API; el contenedor Nginx no hace ese enrutamiento por sí solo.

## Organización

```text
src/
├── main.tsx              # aplicación, autenticación y órdenes
├── Dashboard.tsx         # indicadores y gráficas agregadas
├── Admin.tsx             # usuarios, roles y permisos
├── Pager.tsx             # controles de paginación
├── MobileMenu.tsx        # navegación y preferencias en móvil
├── AmountInput.tsx       # introducción y formato del valor de una orden
├── i18n.tsx              # idioma y apariencia
├── translations.ts       # catálogo de traducciones
├── types.ts              # contratos compartidos de la API
└── components/ui/        # componentes shadcn/ui
docs/                     # guías y casos de uso
```

## Despliegue y límites

GitHub Actions ejecuta pruebas y compilación. El workflow de despliegue puede actualizar la demostración en AWS desde `main` cuando están configuradas las variables de infraestructura; la [guía de despliegue del backend](https://github.com/Arukado01/pagoClaroBack/blob/main/infra/DESPLIEGUE.md) describe requisitos y operación.

El registro público de la demostración concede lectura de **todas** las órdenes y no proporciona aislamiento por usuario, verificación de correo ni recuperación de contraseña. El token se guarda en `sessionStorage`, accesible a JavaScript; para un uso real deben revisarse el modelo de sesión, los permisos, la protección ante abuso y la seguridad del navegador. Los cambios de rol se reflejan en la autorización del servidor en cada solicitud; para actualizar los controles visibles, el usuario debe volver a iniciar sesión.

La interfaz no desactiva usuarios. La conciliación es manual y consulta un simulador; las integraciones, redirecciones y garantías de una pasarela real están descritas como diseño pendiente, no como funcionalidades de cobro disponibles.
