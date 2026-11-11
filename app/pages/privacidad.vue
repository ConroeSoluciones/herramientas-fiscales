<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Política de privacidad',
  description: `Información de privacidad de ${publicConfig.siteName}. Contenido en preparación.`,
  ogTitle: `Política de privacidad | ${publicConfig.siteName}`,
  ogDescription: `Información de privacidad de ${publicConfig.siteName}. Contenido en preparación.`,
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/privacidad')
</script>

<template>
  <section aria-labelledby="privacidad-titulo">
    <h1
      id="privacidad-titulo"
      class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
    >
      Política de privacidad
    </h1>
    <ToolPlaceholder text="El contenido de esta página está en preparación." />
  </section>
</template>
