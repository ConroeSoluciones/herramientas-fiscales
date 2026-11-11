<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig()
const marketingUrl = useMarketingUrl('footer_conoce_csfacturacion')
</script>

<template>
  <footer
    class="mt-12 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
  >
    <div
      class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-slate-300"
    >
      <p>© {{ new Date().getFullYear() }} {{ publicConfig.siteName }}</p>
      <nav aria-label="Enlaces legales">
        <ul class="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <a
              :href="marketingUrl"
              class="hover:text-brand-700 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Visitar CSFacturación
            </a>
          </li>
          <li>
            <NuxtLink
              to="/aviso-legal"
              class="hover:text-brand-700 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Aviso legal
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/privacidad"
              class="hover:text-brand-700 focus-visible:outline-brand-700 dark:hover:text-brand-300 dark:focus-visible:outline-brand-300 rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Política de privacidad
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
</template>
