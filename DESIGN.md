---
name: CSFacturación — Portal de herramientas fiscales
description: Sistema visual claro y práctico para las herramientas fiscales de CSFacturación.
colors:
  brand-50: '#effaff'
  brand-100: '#ddf5fc'
  brand-200: '#bdebf9'
  brand-300: '#8ddbf2'
  brand-400: '#55c2e6'
  brand-500: '#00a5d5'
  brand-600: '#0187d2'
  brand-700: '#0069a8'
  brand-800: '#004f82'
  brand-900: '#1a2c5b'
  brand-950: '#101c3b'
  slate-50: '#f8fafc'
  slate-100: '#f1f5f9'
  slate-200: '#e2e8f0'
  slate-300: '#cbd5e1'
  slate-400: '#94a3b8'
  slate-500: '#64748b'
  slate-600: '#475569'
  slate-700: '#334155'
  slate-800: '#1e293b'
  slate-900: '#0f172a'
  slate-950: '#020617'
  white: '#ffffff'
  rose-error: '#9f1239'
  emerald-success: '#047857'
  amber-warning: '#b45309'
typography:
  display:
    fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif'
    fontSize: '60px'
    fontWeight: 600
    lineHeight: 1
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif'
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: 'Rubik, ui-sans-serif, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: 'Rubik, ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '0.16em'
rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
  pill: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  compact: '12px'
  md: '16px'
  card: '20px'
  lg: '24px'
  xl: '32px'
  2xl: '40px'
components:
  button-primary:
    backgroundColor: '{colors.brand-900}'
    textColor: '{colors.white}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
    height: '48px'
  button-primary-hover:
    backgroundColor: '{colors.brand-800}'
    textColor: '{colors.white}'
    rounded: '{rounded.md}'
  button-promo:
    backgroundColor: '{colors.brand-700}'
    textColor: '{colors.white}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '10px 20px'
    height: '44px'
  input-search:
    backgroundColor: '{colors.white}'
    textColor: '{colors.slate-900}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
  chip-brand:
    backgroundColor: '{colors.brand-50}'
    textColor: '{colors.brand-800}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '4px 12px'
  card-default:
    backgroundColor: '{colors.white}'
    textColor: '{colors.slate-900}'
    rounded: '{rounded.lg}'
    padding: '20px'
  card-featured:
    backgroundColor: '{colors.brand-50}'
    textColor: '{colors.brand-900}'
    rounded: '{rounded.lg}'
    padding: '20px 28px'
---

# Design System: CSFacturación — Portal de herramientas fiscales

## Overview

**Creative North Star: “Mesa de trabajo fiscal”**

El portal se siente como una mesa de trabajo clara y serena: una interfaz en español para resolver una consulta concreta, leer datos con contexto y continuar la tarea sin ruido visual. La marca corporativa aporta reconocimiento mediante su logotipo oficial y su gama de azules; la interfaz conserva una voz propia, práctica y precisa, sin parecer una herramienta operada o avalada por el SAT.

La energía visual aparece en el acento azul, las acciones principales y los espacios promocionales de CSFacturación, pero la tarea siempre domina la jerarquía. El tono combina claridad y precisión con una presencia promocional medida; controles familiares, estados visibles y superficies ordenadas sostienen el uso cotidiano en los temas claro y oscuro.

**Key Characteristics:**

- La consulta o herramienta es el foco; la marca acompaña sin competir.
- Cian CS y azul tinta definen una identidad corporativa reconocible.
- Tarjetas suaves y controles familiares favorecen lectura y acción.
- El mismo lenguaje visual se adapta a tema claro, oscuro y sistema.

## Colors

La paleta combina el cian y los azules corporativos con neutros slate y colores semánticos reservados para estados. Los valores normativos están arriba; la escala `brand-*` completa vive en `app/assets/css/main.css`.

### Primary

- **Cian CS** (`{colors.brand-500}`): Acentos de marca, selección y pequeños indicadores; no se usa como texto pequeño sobre blanco sin verificar contraste.
- **Azul de acción** (`{colors.brand-700}`): Botones con texto claro y acciones que necesitan más contraste.

### Secondary

- **Azul de enlace** (`{colors.brand-600}`): Énfasis e interacciones de marca.
- **Azul profundo** (`{colors.brand-800}`): Enlaces y texto de marca sobre superficies claras.
- **Azul tinta** (`{colors.brand-900}`): Énfasis oscuro, títulos de marca y acción principal.
- **Azul noche** (`{colors.brand-950}`): Superficies profundas y fondos de acento en tema oscuro.
- **Cian hielo** (`{colors.brand-50}`): Fondos suaves para datos destacados y chips.

### Tertiary

- **Rojo de error** (`{colors.rose-error}`): Errores y alertas; nunca sustituye al color corporativo.
- **Verde de éxito** (`{colors.emerald-success}`): Confirmaciones y resultados positivos.
- **Ámbar de atención** (`{colors.amber-warning}`): Avisos y referencias que requieren cautela.

### Neutral

- **Blanco de superficie** (`{colors.white}`): Superficies de tarjetas y controles en tema claro.
- **Fondo claro** (`{colors.slate-50}`): Lienzo de página claro.
- **Texto principal** (`{colors.slate-900}`): Títulos, cifras y contenido de alta prioridad.
- **Texto secundario** (`{colors.slate-600}`): Descripciones y contenido de lectura.
- **Borde claro** (`{colors.slate-200}`): Separación discreta entre superficies.
- **Fondo oscuro** (`{colors.slate-950}`): Lienzo del tema oscuro.
- **Superficie y borde oscuro** (`{colors.slate-900}` / `{colors.slate-800}`): Tarjetas y divisores en tema oscuro.
- **Texto secundario oscuro** (`{colors.slate-300}`): Lectura secundaria sobre fondos oscuros.

**The Cian-as-Accent Rule.** El cian identifica, selecciona y acentúa; el azul tinta o el azul de acción llevan texto y acciones que requieren contraste.

## Typography

**Display Font:** Montserrat (con `ui-sans-serif`, `system-ui` como fallback)
**Body Font:** Rubik (con `ui-sans-serif`, `system-ui` como fallback)
**Label/Mono Font:** Rubik para etiquetas; `font-mono` se reserva para códigos de error.

**Character:** Montserrat da presencia corporativa a títulos; Rubik mantiene una lectura directa en navegación, controles y datos. Las fuentes se cargan desde Google Fonts y usan alternativas de sistema.

### Hierarchy

- **Display** (600, token `{typography.display}`): Titular principal de portada; crece de forma responsiva.
- **Headline** (700, token `{typography.headline}`): Títulos principales de las herramientas.
- **Title** (600, token `{typography.title}`): Títulos de tarjetas y secciones.
- **Body** (400, token `{typography.body}`): Texto de instrucciones, explicaciones y resultados; los bloques de lectura mantienen una longitud moderada.
- **Label** (600, token `{typography.label}`): Etiquetas breves, metadatos y rótulos en mayúsculas con tracking amplio.

**The Two-Voice Rule.** Montserrat pertenece a la jerarquía de títulos; Rubik a la lectura, navegación y controles. No se añade una tercera familia decorativa.

## Layout

La estructura utiliza un contenedor principal de hasta `max-w-7xl` (80rem / 1280px), con márgenes laterales que aumentan en breakpoints y una base de 16px en móvil. La cabecera apila marca, navegación y selector de tema en pantallas estrechas; en escritorio los alinea en una fila.

La portada centra su introducción, sitúa el tipo de cambio como tarjeta prioritaria y continúa con un grid de herramientas que pasa de una columna a dos y hasta tres según el ancho disponible. Las páginas de herramienta mantienen encabezados contenidos y usan columnas para calendarios, formularios o resultados; tablas se desplazan horizontalmente en pantallas pequeñas. El ritmo combina incrementos compactos para controles y separaciones más amplias entre secciones.

## Elevation & Depth

La profundidad se construye primero con capas tonales y bordes finos: página slate, tarjetas claras y superficies oscuras coordinadas en el tema oscuro. Las sombras son suaves y funcionales; las tarjetas de tarea pueden ganar algo de elevación en hover, mientras que el bloque de tipo de cambio de portada recibe un énfasis ligeramente mayor. No se emplean sombras dramáticas ni efectos decorativos persistentes.

### Shadow Vocabulary

- **Reposo** (`shadow-sm`): Separación ligera en tarjetas de datos, formularios y resultados.
- **Énfasis** (`shadow-md`): Tarjeta prioritaria o hover de tarjetas comunes.
- **Hover destacado** (`shadow-lg`): Respuesta breve al pasar por tarjetas interactivas; puede acompañarse de un desplazamiento vertical sutil.

**The Soft-Layer Rule.** El contraste tonal y el borde definen la superficie; la sombra solo confirma prioridad o interacción.

## Shapes

Las tarjetas usan esquinas generosas; campos y controles son algo más compactos; chips y selecciones circulares emplean extremos totalmente redondeados. Los bordes son finos y discretos, con borde discontinuo para espacios provisionales o vacíos. El foco de teclado es un contorno visible y separado, no un resplandor decorativo.

En tema oscuro, el logotipo oficial conserva sus proporciones y colores sobre una pequeña superficie blanca. No reconstruirlo como texto ni cambiar sus trazos.

## Components

### Buttons

Controles precisos y accesibles, con jerarquía clara entre acción principal y alternativas.

- **Shape:** Esquinas suavemente redondeadas (`{rounded.md}`); las llamadas promocionales usan una forma más compacta (`{rounded.sm}`).
- **Primary:** Azul tinta, texto claro, altura cómoda y separación consistente (`{components.button-primary}`).
- **Hover / Focus:** El hover aumenta el contraste; `focus-visible` conserva un contorno de marca claramente visible.
- **Secondary / Ghost:** Superficie clara con borde slate para acciones auxiliares; los enlaces de texto subrayan en hover.
- **Promotional:** Azul de acción con texto claro; reservar su mayor énfasis para el bloque promocional secundario.

### Chips

Etiquetas compactas, no controles primarios.

- **Style:** Fondo cian pálido, texto azul profundo y forma de píldora (`{components.chip-brand}`).
- **State:** Etiquetas de prioridad, categoría o tipo; la selección interactiva se indica además con un estado accesible.

### Cards / Containers

Superficies sobrias que agrupan información relacionada.

- **Corner Style:** Tarjetas suavemente redondeadas (`{rounded.lg}`).
- **Background:** Blanco o slate profundo en tema oscuro; los datos prioritarios pueden usar un tinte de marca.
- **Shadow Strategy:** Elevación suave en reposo y aumento breve en hover.
- **Border:** Línea tenue para separar tarjetas; el acento de marca se reserva para el contenido destacado.
- **Internal Padding:** Espaciado de tarjeta con más aire en escritorio (`{spacing.card}` y `{spacing.lg}`).

### Inputs / Fields

Campos familiares y legibles, integrados en formularios de trabajo.

- **Style:** Fondo claro, borde slate, texto principal y esquinas medianamente redondeadas (`{components.input-search}`).
- **Focus:** Cambio visible de borde más anillo de foco de marca.
- **Error / Disabled:** Mensaje de error en rojo semántico; los campos deshabilitados reducen opacidad e interacción.

### Navigation

La cabecera usa el logotipo oficial como inicio y una navegación textual ligera, con enlaces subrayados al interactuar. En móvil, los elementos pueden envolver en varias líneas; no reemplazar la navegación de herramientas por la navegación comercial completa.

### Theme Switcher

Un grupo compacto de tres opciones —claro, oscuro y sistema— muestra su selección con superficie elevada y estado `aria-pressed`. Mantener etiquetas accesibles aunque el control use pictogramas.

### Featured Exchange Rate

La tarjeta de tipo de cambio es la pieza de datos más visible de la portada: presenta valor, fecha y un enlace a la herramienta de historial. Usa una superficie de marca suave, cifra grande y estados claros de carga o falta de dato.

## Do's and Don'ts

### Do:

- **Do** mantener visible el logotipo oficial sin modificar sus proporciones o colores.
- **Do** dar prioridad visual al dato y a la herramienta que resuelve la consulta.
- **Do** usar colores semánticos solo para error, éxito y atención.
- **Do** conservar estados hover y `focus-visible` legibles en los temas claro y oscuro.
- **Do** mantener la promoción corporativa presente pero secundaria frente a la tarea.

### Don't:

- **Don't** insinuar que la interfaz o la marca tienen aval u operación del SAT.
- **Don't** usar cian brillante como texto pequeño sobre blanco sin comprobar contraste.
- **Don't** sustituir el logotipo por texto reconstruido o un icono genérico de dólar.
- **Don't** añadir sombras fuertes, degradados decorativos o movimiento que distraiga de los datos.
- **Don't** permitir que un bloque promocional desplace la herramienta prioritaria.
