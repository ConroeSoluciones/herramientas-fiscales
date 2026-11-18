# Seguimiento SEO

Revisar estos puntos en un próximo PR de SEO:

- **Páginas legales e indexación:** `/aviso-legal` y `/privacidad` están fuera del sitemap mientras su contenido siga en preparación. Excluirlas del sitemap no evita que Google las indexe si las descubre por otros enlaces. Cuando estén completas, decidir si deben indexarse y, si alguna no debe aparecer en resultados, aplicar `noindex` y verificarlo en producción.
- **Logo de Schema.org:** por ahora `Organization.logo` usa el logo horizontal `public/csfacturacion-logo.svg`. Cuando se entregue el logo cuadrado oficial, actualizar el marcado y comprobar que la imagen pública cumple las recomendaciones vigentes de Google (incluido el mínimo de 112 × 112 px) y que sea rastreable.
