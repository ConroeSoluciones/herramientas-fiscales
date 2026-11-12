<script setup lang="ts">
import type { CatalogErrorSearchResult } from '@cs-herramientas/sat-error-catalogs'

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

interface CatalogCodeSearchResponse {
  results: CatalogErrorSearchResult[]
  hasMore: boolean
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
  refresh: refreshCatalogs,
} = await useFetch<ErrorCatalogSummary[]>('/api/catalogos-error', {
  key: 'sat-error-catalogs',
  default: () => [],
})

const searchInput = ref('')
const searchStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const searchResults = ref<CatalogErrorSearchResult[]>([])
const hasMoreSearchResults = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchController: AbortController | undefined

async function searchAcrossCatalogs(query: string) {
  const controller = new AbortController()
  searchController = controller
  searchStatus.value = 'pending'

  try {
    const response = await $fetch<CatalogCodeSearchResponse>(
      '/api/catalogos-error/buscar',
      { query: { q: query }, signal: controller.signal },
    )

    if (searchController !== controller) return
    searchResults.value = response.results
    hasMoreSearchResults.value = response.hasMore
    searchStatus.value = 'success'
  } catch {
    if (searchController !== controller) return
    searchStatus.value = 'error'
  } finally {
    if (searchController === controller) searchController = undefined
  }
}

watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchController?.abort()
  searchController = undefined
  searchResults.value = []
  hasMoreSearchResults.value = false

  const query = value.trim()
  if (query.length < 2) {
    searchStatus.value = 'idle'
    return
  }

  searchStatus.value = 'pending'
  searchTimer = setTimeout(() => {
    void searchAcrossCatalogs(query)
  }, 250)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchController?.abort()
})

function retrySearch() {
  const query = searchInput.value.trim()
  if (query.length >= 2) void searchAcrossCatalogs(query)
}

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
          Busca un código en todas las matrices o elige un catálogo para
          consultarlo completo.
        </p>
      </div>
    </section>

    <section
      class="mx-auto max-w-5xl py-8 sm:py-10"
      aria-labelledby="busqueda-global-titulo"
    >
      <div
        class="rounded-2xl border border-slate-200 bg-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2
          id="busqueda-global-titulo"
          class="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white"
        >
          Busca un código en todas las matrices
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Escribe el código completo o sus primeros caracteres.
        </p>
        <form role="search" class="mt-5" @submit.prevent>
          <label
            for="busqueda-global-errores"
            class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
          >
            Código de error
          </label>
          <!-- eslint-disable vue/html-self-closing -->
          <input
            id="busqueda-global-errores"
            v-model="searchInput"
            type="search"
            autocomplete="off"
            maxlength="120"
            aria-describedby="ayuda-busqueda-global estado-busqueda-global"
            placeholder="Ejemplo: CFDI40101"
            class="focus:border-brand-500 focus:ring-brand-200 dark:focus:border-brand-400 dark:focus:ring-brand-900 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <!-- eslint-enable vue/html-self-closing -->
        </form>
        <p
          id="ayuda-busqueda-global"
          class="mt-2 text-sm text-slate-500 dark:text-slate-400"
        >
          Escribe al menos dos caracteres para iniciar la búsqueda.
        </p>
        <p
          id="estado-busqueda-global"
          role="status"
          aria-live="polite"
          class="mt-3 text-sm text-slate-600 dark:text-slate-300"
        >
          <template v-if="searchStatus === 'pending'">
            Buscando en todos los catálogos…
          </template>
          <template v-else-if="searchStatus === 'success'">
            <template v-if="searchResults.length > 0">
              {{ searchResults.length }}
              {{
                searchResults.length === 1 ? 'coincidencia' : 'coincidencias'
              }}
              {{ hasMoreSearchResults ? 'o más' : '' }}
            </template>
            <template v-else
              >No encontramos ese código en las matrices.</template
            >
          </template>
          <template v-else-if="searchStatus === 'error'">
            No fue posible realizar la búsqueda.
          </template>
        </p>
        <button
          v-if="searchStatus === 'error'"
          type="button"
          class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          @click="retrySearch"
        >
          Reintentar búsqueda
        </button>
        <ul
          v-if="searchStatus === 'success' && searchResults.length > 0"
          class="mt-5 space-y-3"
          aria-label="Resultados de la búsqueda global"
        >
          <li
            v-for="result in searchResults"
            :key="`${result.catalogClave}-${result.id}`"
          >
            <article
              class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 rounded-lg px-3 py-1 font-mono text-sm font-bold"
                >
                  {{ result.codigoError }}
                </span>
                <span class="text-sm text-slate-600 dark:text-slate-300">
                  {{ result.catalogNombre }}
                </span>
              </div>
              <p
                class="mt-3 leading-7 break-words text-slate-800 dark:text-slate-200"
              >
                {{ result.descripcionCodigoError }}
              </p>
              <NuxtLink
                :to="{
                  path: `/errores/${result.catalogClave}`,
                  query: { q: result.codigoError },
                }"
                class="text-brand-800 focus-visible:outline-brand-700 dark:text-brand-300 dark:focus-visible:outline-brand-300 mt-3 inline-flex font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Ver detalle en esta matriz
                <span class="ml-1" aria-hidden="true">»</span>
              </NuxtLink>
            </article>
          </li>
        </ul>
        <p
          v-if="hasMoreSearchResults"
          class="mt-4 text-sm text-slate-500 dark:text-slate-400"
        >
          Se muestran las primeras 50 coincidencias. Agrega más caracteres para
          acotar la búsqueda.
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
        role="status"
        class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        Cargando catálogos…
      </p>
      <div
        v-else-if="catalogsError"
        role="alert"
        class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
      >
        <p>No fue posible cargar los catálogos.</p>
        <button
          type="button"
          class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 mt-3 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-rose-800 dark:hover:bg-rose-900"
          @click="refreshCatalogs()"
        >
          Reintentar
        </button>
      </div>
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
