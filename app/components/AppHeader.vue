<script setup lang="ts">
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)

function closeMenuOnEscape() {
  if (!menuOpen.value) return

  menuOpen.value = false

  if (!window.matchMedia('(min-width: 64rem)').matches) {
    nextTick(() => menuButton.value?.focus())
  }
}

const marketingUrl = useMarketingUrl('header_conoce_csfacturacion')

const navigation = [
  { label: 'Inicio', to: '/' },
  { label: 'Tipo de cambio', to: '/tipo-de-cambio-dolar-mxn' },
  { label: 'Antigüedad laboral', to: '/calculadora-antiguedad-laboral' },
  { label: 'Códigos de error SAT', to: '/codigos-sat' },
]
</script>

<template>
  <header
    class="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950"
    @keydown.esc.stop.prevent="closeMenuOnEscape"
  >
    <div
      class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8"
    >
      <div class="flex items-center justify-between gap-3 lg:contents">
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

        <button
          ref="menuButton"
          type="button"
          class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden dark:border-slate-700 dark:text-slate-200"
          :aria-expanded="menuOpen"
          aria-controls="navegacion-principal"
          :aria-label="
            menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
          "
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="!menuOpen"
            aria-hidden="true"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            aria-hidden="true"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <nav
        id="navegacion-principal"
        aria-label="Navegación principal"
        :class="menuOpen ? 'block' : 'hidden lg:block'"
        class="w-full border-t border-slate-200 pt-2 lg:w-auto lg:border-0 lg:pt-0 dark:border-slate-800"
      >
        <ul
          class="flex flex-col gap-1 text-sm font-medium lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3"
        >
          <li v-for="item in navigation" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="hover:text-brand-800 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 flex min-h-11 items-center rounded-sm px-3 py-2 text-slate-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-0 dark:text-slate-200"
              @click="menuOpen = false"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
          <li>
            <a
              :href="marketingUrl"
              class="text-brand-800 hover:text-brand-950 focus-visible:outline-brand-700 dark:text-brand-200 dark:focus-visible:outline-brand-300 flex min-h-11 items-center rounded-sm px-3 py-2 font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-0 dark:hover:text-white"
              @click="menuOpen = false"
            >
              Conoce CSFacturación
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
        <div
          class="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 lg:hidden dark:border-slate-800"
        >
          <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
            Preferencia de tema
          </span>
          <ThemeSwitcher />
        </div>
      </nav>
      <div class="hidden lg:block">
        <ThemeSwitcher />
      </div>
    </div>
  </header>
</template>
