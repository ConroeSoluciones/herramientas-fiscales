# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Contadores y asesores que resuelven consultas fiscales para clientes.
- Personal de empresas que administra facturación, CFDI, nómina y otras tareas fiscales en México.
- En ambos casos, suelen llegar con una consulta concreta —por ejemplo, un tipo de cambio, un error de timbrado o una fecha de antigüedad laboral— y necesitan completar esa tarea o encontrar el siguiente paso.

## Product Purpose

Portal de herramientas fiscales de CSFacturación para ayudar a sus usuarios a resolver consultas y tareas concretas relacionadas con facturación y administración fiscal en México. El producto debe facilitar el autoservicio y también apoyar el descubrimiento de CSFacturación y sus servicios corporativos.

## Positioning

El portal combina herramientas específicas para flujos de trabajo mexicanos —consulta del tipo de cambio, búsqueda en matrices oficiales de errores SAT y cálculo de antigüedad para nómina— con referencias a las fuentes originales cuando están disponibles. Su mecanismo es ofrecer el dato o formato aplicable junto con contexto suficiente para que el usuario pueda continuar su tarea, y una vía secundaria para conocer CSFacturación.

## Operating Context

- El portal vive bajo `https://www.csfacturacion.com` y se presenta en español de México.
- Los usuarios consultan datos y herramientas en tareas de facturación, CFDI, nómina y administración fiscal.
- El tipo de cambio se alimenta de registros SIDOF en Cloudflare D1. La portada muestra el segundo registro ordenado por fecha de publicación descendente; el historial se consulta por fecha de aplicación y distingue esta de la fecha de publicación.
- Los catálogos de errores se obtienen de matrices SAT y sus originales se enlazan desde la interfaz. La carga de SIDOF y la sincronización mensual de catálogos dependen de tareas externas; este repositorio no configura sus schedulers. La vigencia de los datos depende de esas actualizaciones.
- La calculadora de antigüedad admite una fecha ingresada manualmente o un XML de nómina. La implementación actual lee el XML en el navegador y extrae `FechaInicioRelLaboral` para generar formatos de antigüedad del CFDI.

## Capabilities and Constraints

- `/tipo-de-cambio-dolar-mxn` permite consultar el tipo de cambio por fecha en un calendario y revisar el historial mensual.
- `/codigos-sat` lista los catálogos SAT sincronizados; cada catálogo permite buscar por código, mensaje, atributo o validación. Las rutas previas bajo `/errores` redirigen permanentemente a esta sección.
- `/calculadora-antiguedad-laboral` calcula antigüedad con fecha manual o XML de nómina, genera formatos para el atributo de antigüedad del CFDI y presenta prestaciones de referencia según la LFT.
- Hay páginas de privacidad y aviso legal.
- El acceso a D1 y las credenciales deben permanecer en el servidor; las APIs públicas solo entregan los datos necesarios para las herramientas.
- Las fuentes oficiales y la fecha de actualización deben mostrarse con precisión. No describir los datos como actuales o en vivo más allá de lo que respalde su fecha de sincronización.
- La lectura local del XML describe la implementación actual y no debe ampliarse a una garantía general de privacidad sin confirmación.

## Brand Commitments

- El nombre visible es **CSFacturación**. El portal es un recurso de CSFacturación, no una marca independiente ni una herramienta operada o avalada por el SAT.
- Usar español de México y terminología fiscal precisa.
- Atribuir las fuentes oficiales —como SIDOF y las matrices SAT— y enlazar el original cuando esté disponible.
- No insinuar aval del SAT ni inventar resultados, evidencia, testimonios o afirmaciones de autoridad.
- Los enlaces de promoción corporativa deben dirigir a CSFacturación y conservar el seguimiento UTM configurado.

## Evidence on Hand

- Implementación funcional de las herramientas en `app/pages/` y APIs de solo servidor en `server/api/`.
- Enlaces a publicaciones SIDOF y a los archivos originales de las matrices SAT configuradas en `config/sat-error-catalogs.json`.
- Logotipo oficial en `public/csfacturacion-logo.svg` y favicon en `public/favicon.png`.
- El repositorio no contiene testimonios de clientes, resultados medidos ni métricas de producto que sustenten claims; no deben fabricarse.

## Product Principles

- Resolver primero la tarea concreta del usuario mediante autoservicio.
- Dar prioridad a datos correctos, contexto fiscal preciso y fuentes primarias verificables.
- Comunicar con claridad fechas, cobertura y vigencia; no prometer más frescura o certeza que la disponible.
- Apoyar el descubrimiento de CSFacturación sin confundir el portal con el SAT ni desplazar la utilidad de las herramientas.
