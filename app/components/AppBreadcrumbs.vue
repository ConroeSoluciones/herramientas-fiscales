<script setup lang="ts">
interface BreadcrumbItem {
  label: string
  to: string
}

const props = defineProps<{
  items: BreadcrumbItem[]
}>()

const { public: publicConfig } = useRuntimeConfig()

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: props.items.map((item) => ({
      name: item.label,
      item: new URL(item.to, publicConfig.siteUrl).toString(),
    })),
  }),
])
</script>

<template>
  <nav aria-label="Ruta de navegación" class="mb-6 text-sm">
    <ol
      class="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300"
    >
      <li
        v-for="(item, index) in items"
        :key="item.to"
        class="flex items-center gap-2"
      >
        <span
          v-if="index > 0"
          aria-hidden="true"
          class="text-slate-400 dark:text-slate-500"
        >
          /
        </span>
        <NuxtLink
          v-if="index < items.length - 1"
          :to="item.to"
          class="hover:text-brand-700 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          aria-current="page"
          class="font-medium text-slate-900 dark:text-white"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
