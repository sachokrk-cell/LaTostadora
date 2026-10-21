# Mejoras de rendimiento de La Tostadora

## Estado

La vista rápida ya fue creada en tu Supabase. Se verificó con lecturas reales que **la tabla original y la vista contienen las mismas 103 ventas** y coinciden sus identificadores, fechas, totales, importes cobrados, saldos y medios de pago.

El frontend optimizado está preparado y probado localmente. **Falta subir los archivos del ZIP a GitHub para que Vercel publique esta versión.** La web actual sigue usando el lector anterior hasta ese despliegue.

## Qué mejora

| Comprobación | Versión anterior medida | Versión optimizada medida |
| --- | --- | --- |
| JSON del historial | 31.128.573 bytes, unos 31 MB | 70.774 bytes, unos 71 KB |
| Peticiones para el historial | 11 | 1 |
| Tiempo de lectura observado | 32,96 segundos | 3,34 segundos |
| JavaScript de entrada sin comprimir | Unos 941,5 KB | Unos 419,2 KB |

Las mediciones de datos se hicieron en momentos distintos: la primera tenía 104 ventas y la actual tiene 103. En la comprobación actual, la vista y la tabla coinciden en las 103: la diferencia entre ambas mediciones no es una pérdida provocada por la vista. Son observaciones de lectura, no una garantía de tiempo fijo; influyen red y estado del servidor. El tamaño JSON se refiere al contenido serializado, antes de la compresión de transporte.

El archivo JavaScript de entrada es más pequeño porque el resto se carga según la sección. El dashboard también descarga su módulo y el código compartido de gráficos cuando se abre; los 419,2 KB no representan todos los recursos de esa pantalla.

Cambios incluidos:

- El historial usa `sales_read_model_v1`, sin imágenes incrustadas en los tickets. La tabla de ventas conserva sus imágenes originales y los importes. La vista usa `security_invoker` para respetar el acceso de la tabla. [Referencia de PostgreSQL](https://www.postgresql.org/docs/current/sql-createview.html).
- Si se instala el frontend en una base donde todavía falta la vista, mantiene el lector anterior por páginas. No oculta errores de permisos detrás de esa alternativa.
- Las ventas nuevas se guardan sin duplicar `imageUrl` y `image_url` dentro de cada ítem. Conservan los campos del producto usados para cantidades, costos y precios históricos. Las imágenes del catálogo siguen funcionando.
- Las actualizaciones se agrupan y se ejecutan en secuencia. Un cambio de clientes o inventario ya no solicita otra descarga del historial entero. Las operaciones esperan su recarga correspondiente aunque haya una lectura en curso.
- Las recargas de fondo mantienen la pantalla visible y muestran “Actualizando datos...”. La carga inicial sigue esperando a recibir el conjunto completo.
- Las secciones y sus dependencias se cargan al abrirlas mediante `React.lazy` y `Suspense`. Se agrega una pantalla de recuperación para errores de renderizado o carga de sección. [Referencia de React](https://react.dev/reference/react/lazy).
- Tailwind genera el CSS al compilar; se retira el script del CDN. El CSS generado pesa unos 37,3 KB, o 6,5 KB con gzip.
- Se agrega un lockfile para fijar las dependencias y pruebas ejecutables con `npm test`.

## Cómo publicarlo sin perder rutas ni extensiones

1. Descargar `LaTostadora-mejoras-rendimiento.zip` y **descomprimirlo**.
2. Abrir la raíz del [repositorio en GitHub](https://github.com/sachokrk-cell/LaTostadora), donde están `package.json` e `index.html`.
3. Usar **Add file → Upload files** y arrastrar las carpetas y archivos descomprimidos. Subir el conjunto en **un solo commit**, conservando las carpetas y las extensiones.
4. Incluir tanto los archivos de la raíz (`package.json`, `package-lock.json`, `index.html`, `postcss.config.cjs`, `tailwind.config.cjs`) como las carpetas `src`, `tests` y `supabase`. El ZIP también contiene `.gitignore` y esta guía. Si GitHub pide confirmar reemplazos, corresponden a los archivos actualizados del parche.
5. Revisar el despliegue del último commit en Vercel. Mantener las variables de Supabase que ya funcionan. No hacen falta nuevas variables de entorno.
6. Al terminar el despliegue, abrir dashboard e historial y comprobar que presentan la información. La cantidad actual es 103, salvo que se agreguen o anulen ventas mientras tanto.

El ZIP contiene solo los archivos nuevos o modificados respecto de `f15eb3a`; se aplica sobre el repositorio que ya está funcionando. No hay que subir el ZIP comprimido como un archivo del repositorio ni reemplazar el repositorio completo. Se conserva el resto del proyecto existente.

El SQL de `supabase/001_fast_sales_read.sql` ya fue ejecutado para esta base. Se incluye para documentar la versión; no hace falta volver a ejecutarlo aquí.

## Validaciones

- `npm test`: **13 pruebas pasan**, incluyendo paginación, errores de permisos, compatibilidad sin vista, datos incompletos, filas duplicadas, reintentos, eliminación de imágenes del payload y concurrencia de recargas.
- Prueba de integración con React: una actualización de producto mantiene `isLoading` desactivado, solo recarga productos y no vuelve a consultar ventas. Una ráfaga de eventos se agrupa por tabla. Un guardado de venta simulado conserva importes/costos, actualiza stock y omite imágenes del payload.
- SQL ejecutado dos veces en PostgreSQL local: conserva los datos originales, el orden de los ítems y los campos financieros. Con RLS, cada rol ve las mismas filas autorizadas y la vista no concede permisos de escritura.
- Lectura con el rol público real: 103 ventas de la tabla, 103 de la vista, 103 identificadores únicos, sin diferencias en los campos financieros comprobados. Resultado en `Medicion-rendimiento.json`.
- `npm run build`: pasa, con CSS compilado y módulos separados.
- Navegación local con datos reales: dashboard, historial, inventario, clientes, resultados, análisis, punto de venta, asesor y nube abren sin errores de ejecución. El historial muestra 103 tickets. No se registraron ventas de prueba ni otras escrituras comerciales en producción.

## Trabajo funcional que queda separado

Esta entrega mejora velocidad y recargas. No restaura las funciones ausentes de cobros, backups, recuperación antigua o edición de compras, ni corrige todavía fechas y criterios contables. La comprobación de TypeScript sigue mostrando los mismos 15 diagnósticos preexistentes; no se incorporó esa comprobación al build para no bloquear el despliegue actual.

La siguiente mejora funcional recomendada es procesar ventas, anulaciones y stock en transacciones de base de datos y completar cobros/historial de pagos. Hace falta inspeccionar el esquema y los triggers existentes antes de preparar esa migración; está descrito en el diagnóstico inicial.
