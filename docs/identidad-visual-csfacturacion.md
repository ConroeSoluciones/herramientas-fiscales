# Identidad visual de CSFacturación

Esta guía define cómo debe caracterizarse el portal de herramientas fiscales que vive bajo `https://www.csfacturacion.com`. El portal es parte de CSFacturación, no una marca independiente: debe ser reconocible como producto de la empresa y, al mismo tiempo, conservar una interfaz clara y enfocada en las consultas.

## Marca y propósito

- Usar **CSFacturación** como nombre visible, en español y con acento. El dominio y algunos nombres técnicos pueden escribirse `CSFacturacion` sin acento.
- Presentar las herramientas como recursos de CSFacturación. No afirmar ni insinuar que el portal es operado o avalado por el SAT.
- Al citar datos oficiales, identificar la fuente (por ejemplo, SIDOF o la matriz SAT correspondiente) y enlazar al documento original cuando esté disponible.
- Mantener un tono profesional, directo y útil para personas que facturan, administran CFDI o realizan tareas fiscales en México.

## Logotipo e iconografía

- Usar `public/csfacturacion-logo.svg`, el logotipo oficial descargado del sitio de CSFacturación, en el encabezado.
- Conservar sus proporciones y colores; no reconstruirlo con texto, cambiar sus trazos ni aplicar filtros.
- El logotipo tiene letras oscuras. En modo oscuro debe conservarse sobre una superficie blanca para mantener el contraste.
- Usar `public/favicon.png` como favicon. No sustituir la marca por un símbolo genérico de dólar.

## Paleta de color

Los tonos principales se toman del logotipo y del sitio público. Los tokens `brand-*` están definidos en `app/assets/css/main.css`.

| Token / color           | Hex             | Uso recomendado                                                               |
| ----------------------- | --------------- | ----------------------------------------------------------------------------- |
| `brand-500`             | `#00A5D5`       | Azul celeste principal del logotipo; acentos, detalles y estados activos.     |
| `brand-600`             | `#0187D2`       | Azul secundario del logotipo; énfasis y enlaces.                              |
| `brand-700`             | `#0069A8`       | Acciones con texto blanco y estados interactivos que requieren más contraste. |
| `brand-900`             | `#1A2C5B`       | Azul marino corporativo; énfasis oscuro y títulos de marca.                   |
| `brand-50`–`brand-200`  | Tonos pálidos   | Fondos sutiles, selección y superficies destacadas en tema claro.             |
| `brand-800`–`brand-950` | Tonos profundos | Texto/enlaces sobre fondos claros y superficies de marca en tema oscuro.      |

- Preferir el azul marino o los tonos `brand-700`/`brand-800` para texto pequeño sobre blanco; reservar el celeste brillante para acentos, no para texto de bajo contraste.
- Mantener superficies blancas o gris muy claro en tema claro, y azul/gris muy oscuro en tema oscuro.
- Reservar rojo para errores/alertas y verde para estados positivos. No usar esos colores como sustitutos del azul corporativo.
- Asegurar que texto, controles, foco visible y estados seleccionados mantengan contraste suficiente en ambos temas.

## Tipografía

- **Montserrat** para encabezados (`h1`–`h6`) y piezas de marca: comunica una apariencia corporativa y coincide con la navegación del sitio público.
- **Rubik** para texto, navegación, controles y contenido general: mantiene una lectura clara en interfaces funcionales.
- Ambas fuentes se cargan desde Google Fonts en `nuxt.config.ts`, con `sans-serif` como alternativa. Si se decide alojarlas localmente, conservar familias, pesos y métricas equivalentes.
- Mantener la jerarquía tipográfica existente: la portada puede tener un titular más grande; páginas de herramientas usan títulos más contenidos, con texto de lectura cómodo.

## Interfaz y comportamiento

- Priorizar claridad, legibilidad, datos y navegación antes que elementos promocionales. Esta sección de dominio complementa el sitio corporativo; no debe copiar su navegación comercial completa.
- Usar el azul de marca para enlaces, foco, selección del calendario y acciones principales. Los estados hover y focus deben ser visibles tanto con mouse como con teclado.
- Mantener tarjetas sobrias, bordes suaves y espacios consistentes; evitar sombras intensas, degradados decorativos o animaciones que distraigan de los datos.
- Respetar las preferencias de tema claro, oscuro o sistema y revisar cada componente en ambos temas.
- Usar español de México, formatos locales (`es-MX`) y términos fiscales precisos. Nombrar claramente la fecha de aplicación y la fecha de publicación cuando ambas aparezcan.

## Dominio y metadatos

- El dominio canónico configurado para publicar es `https://www.csfacturacion.com` (`NUXT_PUBLIC_SITE_URL`). Mantener una única variante canónica con `www`.
- El nombre público y el sufijo de títulos son `CSFacturación` (`NUXT_PUBLIC_SITE_NAME`).
- Si cambia el dominio de montaje, confirmar con quien administra el sitio corporativo la ruta final y actualizar `NUXT_PUBLIC_SITE_URL`, sitemap, canonicales, metadatos y enlaces absolutos antes de publicar.
- Mantener el título y la descripción SEO propios de cada herramienta, sin repetir claims corporativos que no correspondan a su función.
