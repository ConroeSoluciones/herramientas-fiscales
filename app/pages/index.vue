<script setup lang="ts">
interface PenultimateExchangeRate {
  codNota: number
  publicationDate: string
  pesosPerDollar: number
}

const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Herramientas fiscales',
  description:
    'Herramientas fiscales de CSFacturación: consulta el tipo de cambio publicado por SIDOF y busca códigos de error de CFDI.',
  ogTitle: `Herramientas fiscales | ${publicConfig.siteName}`,
  ogDescription:
    'Tipo de cambio oficial y buscador de códigos de error del SAT.',
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/')

const {
  data: exchangeRate,
  status: exchangeRateStatus,
  error: exchangeRateError,
} = await useFetch<PenultimateExchangeRate | null>(
  '/api/tipo-cambio/penultimo',
  {
    key: 'penultimate-exchange-rate',
  },
)

const formattedRate = computed(() => {
  const value = exchangeRate.value?.pesosPerDollar
  if (typeof value !== 'number') return null

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
})

const formattedPublicationDate = computed(() => {
  const value = exchangeRate.value?.publicationDate
  if (!value) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf())) return null

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
})
</script>

<template>
  <div class="space-y-10 pb-10 sm:space-y-12">
    <section aria-labelledby="inicio-titulo" class="pt-6 text-center sm:pt-10">
      <p
        class="text-brand-800 dark:text-brand-300 mb-5 text-xs font-semibold tracking-[0.24em] sm:text-sm"
      >
        HERRAMIENTAS FISCALES <span aria-hidden="true">·</span> MÉXICO
      </p>
      <h1
        id="inicio-titulo"
        class="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white"
      >
        Herramientas fiscales de
        <span class="text-brand-800 dark:text-brand-300">CSFacturación</span>
      </h1>
      <p
        class="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-500 sm:text-xl sm:leading-9 dark:text-slate-300"
      >
        Consulta el tipo de cambio oficial y encuentra respuestas a errores de
        tus comprobantes fiscales.
      </p>
    </section>

    <section aria-label="Tipo de cambio para pagos SAT" class="text-center">
      <NuxtLink
        to="/tipo-de-cambio-dolar-mxn"
        :aria-label="`Ver el tipo de cambio publicado el ${formattedPublicationDate ?? 'último disponible'}`"
        class="border-brand-300 bg-brand-50/70 hover:border-brand-500 focus-visible:outline-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:focus-visible:outline-brand-300 mx-auto flex max-w-xl flex-col items-stretch gap-4 rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"
      >
        <div class="min-w-0">
          <p
            class="text-brand-900 dark:text-brand-200 text-xs font-semibold tracking-wider"
          >
            PARA PAGOS SAT HOY
          </p>
          <p
            aria-live="polite"
            class="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
          >
            {{
              formattedRate ??
              (exchangeRateStatus === 'pending' ? 'Cargando…' : 'No disponible')
            }}
          </p>
          <p
            class="text-brand-900 dark:text-brand-200 mt-1 text-xs font-medium tracking-wide"
          >
            <template v-if="formattedPublicationDate">
              TIPO DE CAMBIO EN VIVO · {{ formattedPublicationDate }}
            </template>
            <template v-else-if="exchangeRateError">
              TIPO DE CAMBIO TEMPORALMENTE NO DISPONIBLE
            </template>
            <template v-else>
              ESPERANDO REGISTROS EN LA BASE DE DATOS
            </template>
          </p>
        </div>
        <span
          class="border-brand-300 text-brand-900 dark:border-brand-800 dark:text-brand-200 border-t pt-3 text-sm leading-6 font-medium sm:border-t-0 sm:border-l sm:py-2 sm:pt-0 sm:pl-5"
        >
          <span class="block">Ver FIX, DOF</span>
          <span class="block">y Para Pagos »</span>
        </span>
      </NuxtLink>
    </section>

    <section
      aria-label="Herramientas disponibles"
      class="mx-auto grid max-w-5xl gap-5 md:grid-cols-2"
    >
      <NuxtLink
        to="/tipo-de-cambio-dolar-mxn"
        class="group border-brand-300 focus-visible:outline-brand-700 dark:border-brand-800 dark:focus-visible:outline-brand-300 flex min-h-72 flex-col rounded-2xl border bg-white p-7 shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-slate-900"
      >
        <span
          aria-hidden="true"
          class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 grid size-14 place-items-center rounded-2xl text-2xl font-semibold"
        >
          $¥
        </span>
        <span
          class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 mt-5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
        >
          PRIORIDAD · USD/MXN
        </span>
        <h2
          class="group-hover:text-brand-900 dark:group-hover:text-brand-200 mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          Tipo de Cambio SAT
        </h2>
        <p
          class="mt-4 flex-1 text-base leading-7 text-slate-500 dark:text-slate-300"
        >
          Consulta el tipo de cambio oficial publicado para obligaciones en
          moneda extranjera.
        </p>
        <span
          class="text-brand-800 dark:text-brand-300 mt-6 text-sm font-semibold"
        >
          Ver tipo de cambio <span aria-hidden="true">»</span>
        </span>
      </NuxtLink>

      <NuxtLink
        to="/errores"
        class="group hover:border-brand-300 focus-visible:outline-brand-700 dark:hover:border-brand-700 dark:focus-visible:outline-brand-300 flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <span
          aria-hidden="true"
          class="grid size-14 place-items-center rounded-2xl bg-rose-50 text-2xl text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        >
          ⚠
        </span>
        <span
          class="mt-5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          CFDI 4.0 · RETENCIONES 2.0
        </span>
        <h2
          class="group-hover:text-brand-900 dark:group-hover:text-brand-200 mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          Buscar códigos de error del SAT
        </h2>
        <p
          class="mt-4 flex-1 text-base leading-7 text-slate-500 dark:text-slate-300"
        >
          Consulta catálogos oficiales, encuentra un código y revisa el mensaje
          y la regla que valida.
        </p>
        <span
          class="text-brand-800 dark:text-brand-300 mt-6 text-sm font-semibold"
        >
          Explorar catálogos <span aria-hidden="true">»</span>
        </span>
      </NuxtLink>
    </section>
  </div>
</template>
