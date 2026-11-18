<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig()

useSchemaOrg([
  defineWebSite({
    name: 'CSFacturacion',
    alternateName: 'CSFacturación',
    url: publicConfig.siteUrl,
    inLanguage: 'es-MX',
  }),
  defineOrganization({
    name: 'CSFacturacion',
    alternateName: 'CSFacturación',
    url: publicConfig.siteUrl,
    description:
      'Herramientas fiscales para consultar el tipo de cambio y códigos SAT de CFDI y nómina.',
    logo: new URL('/csfacturacion-logo.svg', publicConfig.siteUrl).toString(),
    sameAs: [
      'https://www.facebook.com/CSFacturacion/',
      'https://www.tiktok.com/@csfacturacion',
      'https://www.instagram.com/csfacturacion',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'ventas@csfacturacion.com',
        availableLanguage: 'es-MX',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'soporte@csfacturacion.com',
        availableLanguage: 'es-MX',
      },
    ],
  }),
])
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
