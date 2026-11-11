<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <p
    class="max-w-3xl rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
  >
    {{ text }}
  </p>
</template>
