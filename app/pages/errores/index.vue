<script setup lang="ts">
interface ErrorCatalogSummary {
  id: number
  clave: string
  nombre: string
  urlFuente: string
  actualizadoEn: string
  totalErrores: number
  primerCodigo: string | null
  ultimoCodigo: string | null
}

const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Matrices de errores del SAT',
  description:
    'Consulta las matrices oficiales de errores del SAT para CFDI y retenciones, con códigos y descripciones.',
  ogTitle: `Matrices de errores del SAT | ${publicConfig.siteName}`,
  ogDescription:
    'Catálogos oficiales de errores para identificar mensajes y validaciones del SAT.',
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/errores')

const {
  data: catalogs,
  status: catalogsStatus,
  error: catalogsError,
} = await useFetch<ErrorCatalogSummary[]>('/api/catalogos-error', {
  key: 'sat-error-catalogs',
  default: () => [],
})

function formatUpdatedAt(value: string): string {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.valueOf())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
</script>

<template>
  <div>
    <section
      class="relative left-1/2 w-screen -translate-x-1/2 border-b border-slate-200 bg-slate-100 py-10 sm:py-14 dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="errores-titulo"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1
          id="errores-titulo"
          class="max-w-6xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
        >
          Matrices de errores del SAT
        </h1>
        <p
          class="mt-6 max-w-6xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 dark:text-slate-300"
        >
          Cuando tu factura no se puede timbrar, el sistema te devuelve un
          código de error del SAT. Aquí están las matrices oficiales
          disponibles, con el mensaje de cada error y la regla que revisa.
        </p>
        <p
          class="mt-6 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 dark:text-slate-300"
        >
          Entra al catálogo del complemento que estás usando y busca tu código.
        </p>
      </div>
    </section>

    <section
      class="mx-auto max-w-7xl px-0 py-10 sm:py-12"
      aria-label="Catálogos de errores disponibles"
      aria-live="polite"
    >
      <p
        v-if="catalogsStatus === 'pending'"
        class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        Cargando catálogos…
      </p>
      <p
        v-else-if="catalogsError"
        role="alert"
        class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
      >
        No fue posible cargar los catálogos. Intenta de nuevo más tarde.
      </p>
      <p
        v-else-if="catalogs.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        Aún no hay catálogos sincronizados. Ejecuta
        <code class="font-semibold">pnpm sat:catalogos:sync</code>
        para importarlos.
      </p>
      <ul v-else class="grid gap-5 md:grid-cols-2">
        <li v-for="catalog in catalogs" :key="catalog.id">
          <NuxtLink
            :to="`/errores/${catalog.clave}`"
            class="group hover:border-brand-300 focus-visible:outline-brand-700 dark:hover:border-brand-800 dark:focus-visible:outline-brand-300 block h-full rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h2
                class="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
              >
                {{ catalog.nombre }}
              </h2>
              <span
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ catalog.clave }}
              </span>
            </div>
            <p
              class="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300"
            >
              <strong class="font-semibold text-slate-900 dark:text-white">
                {{ catalog.totalErrores.toLocaleString('es-MX') }} errores
              </strong>
              <template v-if="catalog.primerCodigo && catalog.ultimoCodigo">
                <span aria-hidden="true"> · </span>
                {{ catalog.primerCodigo }} a {{ catalog.ultimoCodigo }}
              </template>
            </p>
            <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Sincronizado el {{ formatUpdatedAt(catalog.actualizadoEn) }}
            </p>
            <span
              class="text-brand-800 dark:text-brand-300 mt-5 inline-block text-sm font-semibold"
            >
              Buscar en este catálogo <span aria-hidden="true">»</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
      <p
        v-if="catalogs.length > 0"
        class="mt-6 text-sm leading-6 text-slate-500 dark:text-slate-400"
      >
        Fuente: matrices oficiales del SAT. Los catálogos se actualizan desde
        sus archivos originales.
      </p>
    </section>
  </div>
</template>
