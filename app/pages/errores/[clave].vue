<script setup lang="ts">
import type {
  CatalogErrorRecord,
  CatalogSummary,
} from '@cs-herramientas/sat-error-catalogs'

interface CatalogDetailResponse {
  catalog: CatalogSummary
  errors: CatalogErrorRecord[]
}

const route = useRoute()
const { public: publicConfig } = useRuntimeConfig()
const clave = computed(() => String(route.params.clave ?? ''))
const initialSearchQuery =
  typeof route.query.q === 'string' ? route.query.q.trim() : ''
const searchInput = ref(initialSearchQuery)
const searchQuery = ref(initialSearchQuery)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    searchQuery.value = value.trim()
  }, 250)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

const {
  data: detail,
  status,
  error,
} = await useFetch<CatalogDetailResponse>(
  () => `/api/catalogos-error/${encodeURIComponent(clave.value)}`,
  {
    query: computed(() => ({ q: searchQuery.value })),
  },
)

const pageTitle = computed(
  () => detail.value?.catalog.nombre ?? 'Matriz de errores del SAT',
)

useSeoMeta({
  title: pageTitle,
  description: computed(() =>
    detail.value
      ? `Consulta ${detail.value.catalog.totalErrores} errores de ${detail.value.catalog.nombre}. Busca códigos, mensajes y reglas de validación del SAT.`
      : 'Consulta los códigos, mensajes y reglas de validación de los catálogos oficiales del SAT.',
  ),
  ogTitle: computed(() => `${pageTitle.value} | ${publicConfig.siteName}`),
  ogDescription: computed(
    () => `Busca códigos y mensajes de error SAT en ${pageTitle.value}.`,
  ),
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl(() => `/errores/${encodeURIComponent(clave.value)}`)

const groupedErrors = computed(() => {
  const groups = new Map<string, CatalogErrorRecord[]>()

  for (const errorRecord of detail.value?.errors ?? []) {
    const label = errorRecord.elemento.trim() || 'Reglas de validación'
    const group = groups.get(label) ?? []
    group.push(errorRecord)
    groups.set(label, group)
  }

  return [...groups].map(([label, records]) => ({ label, records }))
})

const isSearchPending = computed(
  () =>
    status.value === 'pending' ||
    searchInput.value.trim() !== searchQuery.value,
)

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
  <div v-if="detail" class="pb-10">
    <section
      class="relative left-1/2 w-screen -translate-x-1/2 border-b border-slate-200 bg-slate-100 px-4 py-10 sm:px-8 sm:py-14 dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="catalogo-titulo"
    >
      <div class="mx-auto max-w-5xl">
        <NuxtLink
          to="/errores"
          class="text-brand-700 focus-visible:outline-brand-700 dark:text-brand-300 dark:focus-visible:outline-brand-300 mb-8 inline-flex items-center gap-2 font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span aria-hidden="true">←</span>
          Todas las matrices de errores del SAT
        </NuxtLink>
        <h1
          id="catalogo-titulo"
          class="max-w-5xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
        >
          {{ detail.catalog.nombre }}
        </h1>
        <p
          class="mt-6 max-w-5xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 dark:text-slate-300"
        >
          Estos son los
          <strong class="font-bold text-slate-950 dark:text-white">
            {{ detail.catalog.totalErrores.toLocaleString('es-MX') }} códigos de
            error
          </strong>
          <template
            v-if="detail.catalog.primerCodigo && detail.catalog.ultimoCodigo"
          >
            ({{ detail.catalog.primerCodigo }} a
            {{ detail.catalog.ultimoCodigo }})
          </template>
          de esta matriz: el mensaje que devuelve tu sistema o el SAT y la regla
          que revisa en cada uno.
        </p>
        <p
          class="mt-5 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 dark:text-slate-300"
        >
          Busca el código que te salió o pega el mensaje del error.
        </p>
        <p class="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Fuente: matriz oficial del SAT. Sincronizado el
          {{ formatUpdatedAt(detail.catalog.actualizadoEn) }}.
        </p>
        <a
          :href="detail.catalog.urlFuente"
          target="_blank"
          rel="noopener noreferrer"
          class="text-brand-700 focus-visible:outline-brand-700 dark:text-brand-300 dark:focus-visible:outline-brand-300 mt-4 inline-flex font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Descargar el original del SAT (Excel)
          <span class="sr-only"> (abre en una pestaña nueva)</span>
        </a>
      </div>
    </section>

    <section
      class="mx-auto mt-10 max-w-5xl"
      aria-label="Buscar errores del catálogo"
    >
      <form
        role="search"
        class="rounded-2xl border border-slate-200 bg-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        @submit.prevent
      >
        <label
          for="busqueda-error"
          class="mb-4 block text-base font-semibold text-slate-950 sm:text-lg dark:text-white"
        >
          Busca un código o el texto del error
        </label>
        <!-- eslint-disable vue/html-self-closing -->
        <input
          id="busqueda-error"
          v-model="searchInput"
          type="search"
          autocomplete="off"
          maxlength="120"
          :aria-describedby="isSearchPending ? 'estado-busqueda' : undefined"
          placeholder="Ejemplo: CFDI40101 o escribe una parte del mensaje"
          class="focus:border-brand-500 focus:ring-brand-200 dark:focus:border-brand-400 dark:focus:ring-brand-900 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <!-- eslint-enable vue/html-self-closing -->
        <p
          id="estado-busqueda"
          aria-live="polite"
          class="mt-4 text-sm text-slate-600 dark:text-slate-300"
        >
          <template v-if="isSearchPending">Buscando…</template>
          <template v-else-if="searchQuery">
            {{ detail.errors.length.toLocaleString('es-MX') }} resultados de
            {{ detail.catalog.totalErrores.toLocaleString('es-MX') }} errores
          </template>
          <template v-else>
            {{ detail.catalog.totalErrores.toLocaleString('es-MX') }} errores
          </template>
        </p>
      </form>
    </section>

    <section class="mx-auto mt-10 max-w-5xl" aria-label="Resultados de errores">
      <p
        v-if="error"
        role="alert"
        class="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
      >
        No fue posible cargar los errores. Intenta de nuevo más tarde.
      </p>
      <p
        v-else-if="!isSearchPending && detail.errors.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        No encontramos errores que coincidan con la búsqueda.
      </p>
      <div v-else class="space-y-10">
        <section
          v-for="group in groupedErrors"
          :key="group.label"
          :aria-label="`Errores de ${group.label}`"
        >
          <h2
            class="mb-3 flex items-center gap-3 text-xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Errores de {{ group.label }}
            <span
              class="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200 rounded-full px-2.5 py-0.5 text-sm"
            >
              {{ group.records.length }}
            </span>
          </h2>
          <ul class="space-y-4">
            <li v-for="record in group.records" :key="record.id">
              <article
                class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 rounded-lg px-3 py-1 font-mono text-sm font-bold"
                  >
                    {{ record.codigoError }}
                  </span>
                  <span class="text-sm text-slate-500 dark:text-slate-400">
                    <template v-if="record.elemento || record.atributo">
                      {{ record.elemento
                      }}<template v-if="record.atributo">
                        · {{ record.atributo }}</template
                      >
                    </template>
                    <template v-else>Regla {{ record.num }}</template>
                  </span>
                </div>
                <h3
                  class="text-base leading-7 font-semibold text-slate-950 sm:text-lg dark:text-white"
                >
                  {{ record.descripcionCodigoError }}
                </h3>
                <p class="mt-3 leading-7 text-slate-700 dark:text-slate-300">
                  <strong class="font-semibold">Qué revisa el SAT:</strong>
                  {{ record.validacion }}
                </p>
                <p
                  v-if="record.aclaraciones"
                  class="mt-3 leading-7 text-slate-600 dark:text-slate-400"
                >
                  <strong class="font-semibold">Aclaraciones:</strong>
                  {{ record.aclaraciones }}
                </p>
              </article>
            </li>
          </ul>
        </section>
      </div>
    </section>
  </div>

  <section v-else-if="status === 'pending'" class="mx-auto max-w-5xl py-12">
    <p class="text-slate-600 dark:text-slate-300">Cargando catálogo…</p>
  </section>

  <section v-else class="mx-auto max-w-5xl py-12" role="alert">
    <h1 class="text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
      No encontramos este catálogo
    </h1>
    <NuxtLink
      to="/errores"
      class="text-brand-700 dark:text-brand-300 mt-4 inline-flex font-semibold hover:underline"
    >
      Volver a los catálogos
    </NuxtLink>
  </section>
</template>
