<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Aviso legal',
  description: `Información legal de ${publicConfig.siteName}. Contenido en preparación.`,
  ogTitle: `Aviso legal | ${publicConfig.siteName}`,
  ogDescription: `Información legal de ${publicConfig.siteName}. Contenido en preparación.`,
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/aviso-legal')
</script>

<template>
  <section aria-labelledby="aviso-legal-titulo">
    <h1
      id="aviso-legal-titulo"
      class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
    >
      Aviso legal
    </h1>
    <ToolPlaceholder text="El contenido de esta página está en preparación." />
  </section>
</template>
