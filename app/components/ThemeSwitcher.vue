<script setup lang="ts">
const colorMode = useColorMode()

const themes = [
  { label: 'Claro', value: 'light', icon: '☀' },
  { label: 'Oscuro', value: 'dark', icon: '☾' },
  { label: 'Sistema', value: 'system', icon: '◐' },
] as const
</script>

<template>
  <ColorScheme placeholder="">
    <div
      role="group"
      aria-label="Tema de color"
      class="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900"
    >
      <button
        v-for="theme in themes"
        :key="theme.value"
        type="button"
        :aria-label="`Tema ${theme.label.toLowerCase()}`"
        :aria-pressed="colorMode.preference === theme.value"
        :title="theme.label"
        class="hover:text-brand-800 focus-visible:outline-brand-700 dark:hover:text-brand-200 dark:focus-visible:outline-brand-300 grid size-8 cursor-pointer place-items-center rounded-lg text-base text-slate-600 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300"
        :class="
          colorMode.preference === theme.value
            ? 'text-brand-900 dark:text-brand-200 bg-white shadow-sm dark:bg-slate-800'
            : ''
        "
        @click="colorMode.preference = theme.value"
      >
        <span aria-hidden="true">{{ theme.icon }}</span>
      </button>
    </div>
  </ColorScheme>
</template>
