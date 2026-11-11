<script setup lang="ts">
const marketingUrl = useMarketingUrl('header_conoce_csfacturacion')

const navigation = [
  { label: 'Inicio', to: '/' },
  { label: 'Tipo de cambio', to: '/tipo-de-cambio-dolar-mxn' },
  { label: 'Antigüedad laboral', to: '/calculadora-antiguedad-laboral' },
  { label: 'Códigos de error SAT', to: '/errores' },
]
</script>

<template>
  <header
    class="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950"
  >
    <div
      class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
    >
      <NuxtLink
        to="/"
        aria-label="CSFacturación, inicio"
        class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 flex w-fit items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 dark:rounded-md dark:bg-white dark:px-2 dark:py-1"
      >
        <!-- eslint-disable vue/html-self-closing -->
        <img
          src="/csfacturacion-logo.svg"
          alt="CSFacturación"
          class="h-7 w-auto sm:h-8"
        />
        <!-- eslint-enable vue/html-self-closing -->
      </NuxtLink>

      <nav aria-label="Navegación principal">
        <ul
          class="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium sm:gap-x-4 sm:text-sm"
        >
          <li v-for="item in navigation" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="hover:text-brand-800 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 rounded-sm text-slate-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-200"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
          <li>
            <a
              :href="marketingUrl"
              class="text-brand-800 hover:text-brand-950 focus-visible:outline-brand-700 dark:text-brand-200 dark:focus-visible:outline-brand-300 rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-white"
            >
              Conoce CSFacturación
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </nav>
      <ThemeSwitcher />
    </div>
  </header>
</template>
