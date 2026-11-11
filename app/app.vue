<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig()

useSchemaOrg([
  defineWebSite({ name: publicConfig.siteName, url: publicConfig.siteUrl }),
  defineOrganization({
    name: publicConfig.siteName,
    url: publicConfig.siteUrl,
  }),
])
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
