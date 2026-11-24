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
    'Herramientas fiscales de CSFacturación: consulta el tipo de cambio, valida la estructura de un CFDI XML y busca códigos de error.',
  ogTitle: `Herramientas fiscales | ${publicConfig.siteName}`,
  ogDescription:
    'Consulta herramientas de tipo de cambio, validación estructural CFDI y búsqueda de códigos de error.',
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

const sourceUrl = computed(() => {
  const codNota = exchangeRate.value?.codNota
  if (typeof codNota !== 'number' || !Number.isSafeInteger(codNota)) return null

  return `https://sidof.segob.gob.mx/notas/${codNota}`
})
</script>

<template>
  <div class="space-y-8 pb-10 sm:space-y-12">
    <section aria-labelledby="inicio-titulo" class="pt-4 text-center sm:pt-10">
      <h1
        id="inicio-titulo"
        class="mx-auto max-w-4xl text-3xl leading-tight font-semibold tracking-tight text-balance text-slate-950 sm:text-5xl sm:leading-[1.1] lg:text-6xl dark:text-white"
      >
        Herramientas fiscales de
        <span class="text-brand-800 dark:text-brand-300">CSFacturación</span>
      </h1>
      <p
        class="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-500 sm:mt-5 sm:text-xl sm:leading-9 dark:text-slate-300"
      >
        Consulta el tipo de cambio del dólar, busca códigos de error de CFDI y
        calcula la antigüedad laboral para nómina.
      </p>
    </section>

    <section aria-label="Tipo de cambio del dólar" class="text-center">
      <NuxtLink
        to="/tipo-de-cambio-dolar-mxn"
        class="border-brand-300 bg-brand-50/70 hover:border-brand-500 focus-visible:outline-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:focus-visible:outline-brand-300 mx-auto flex max-w-xl flex-col items-stretch gap-4 rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-7"
      >
        <div class="min-w-0 text-center sm:text-left">
          <p
            class="text-brand-900 dark:text-brand-200 text-xs font-semibold tracking-wider"
          >
            TIPO DE CAMBIO SAT
          </p>
          <p
            aria-live="polite"
            class="mt-1 text-3xl leading-tight font-semibold tracking-tight text-slate-950 tabular-nums sm:text-4xl dark:text-white"
          >
            {{
              formattedRate ??
              (exchangeRateStatus === 'pending' ? 'Cargando…' : 'No disponible')
            }}
          </p>
          <p
            :role="
              exchangeRateError
                ? 'alert'
                : exchangeRateStatus === 'pending'
                  ? 'status'
                  : undefined
            "
            class="mt-1 text-xs font-medium tracking-wide"
            :class="
              exchangeRateError
                ? 'text-rose-800 dark:text-rose-300'
                : 'text-brand-900 dark:text-brand-200'
            "
          >
            <template v-if="formattedPublicationDate">
              PUBLICADO EL {{ formattedPublicationDate }}
            </template>
            <template v-else-if="exchangeRateStatus === 'pending'">
              CONSULTANDO EL TIPO DE CAMBIO…
            </template>
            <template v-else-if="exchangeRateError">
              NO SE PUDO CONSULTAR. REVISA EL HISTORIAL.
            </template>
            <template v-else-if="formattedRate">
              FECHA DE PUBLICACIÓN NO DISPONIBLE.
            </template>
            <template v-else> SIN REGISTROS DISPONIBLES. </template>
          </p>
        </div>
        <span
          class="border-brand-300 text-brand-900 dark:border-brand-800 dark:text-brand-200 flex min-h-11 w-full shrink-0 items-center justify-between gap-3 border-t pt-3 text-sm leading-6 font-medium sm:w-auto sm:border-t-0 sm:border-l sm:py-2 sm:pt-0 sm:pl-5"
        >
          <span class="whitespace-nowrap">Ver historial por fecha</span>
          <svg
            aria-hidden="true"
            class="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 12h14m-7-7 7 7-7 7"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </NuxtLink>
      <p
        v-if="sourceUrl"
        class="mx-auto mt-2 max-w-xl text-center text-xs leading-5 text-slate-600 dark:text-slate-400"
      >
        Fuente:
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-brand-800 decoration-brand-300 hover:text-brand-950 dark:text-brand-200 underline underline-offset-2 dark:hover:text-white"
        >
          Sistema de Información del Diario Oficial de la Federación (SIDOF),
          México
        </a>
      </p>
    </section>

    <section
      aria-labelledby="mas-herramientas-titulo"
      class="mx-auto max-w-3xl"
    >
      <h2
        id="mas-herramientas-titulo"
        class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
      >
        Más herramientas
      </h2>
      <ul
        class="mt-2 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800"
      >
        <li>
          <NuxtLink
            to="/codigos-sat"
            class="group focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 flex min-h-11 items-center justify-between gap-3 rounded-sm py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-5 sm:py-5"
          >
            <div>
              <h3
                class="group-hover:text-brand-800 dark:group-hover:text-brand-300 text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              >
                Buscar códigos de error del SAT
              </h3>
              <p
                class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                Busca un código en los catálogos del SAT y consulta su mensaje y
                regla de validación.
              </p>
            </div>
            <svg
              aria-hidden="true"
              class="text-brand-800 dark:text-brand-300 size-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14m-7-7 7 7-7 7"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/calculadora-antiguedad-laboral"
            class="group focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 flex min-h-11 items-center justify-between gap-3 rounded-sm py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-5 sm:py-5"
          >
            <div>
              <h3
                class="group-hover:text-brand-800 dark:group-hover:text-brand-300 text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              >
                Calculadora de antigüedad laboral
              </h3>
              <p
                class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                Calcula el tiempo laborado y obtén el formato de antigüedad para
                el CFDI de nómina.
              </p>
            </div>
            <svg
              aria-hidden="true"
              class="text-brand-800 dark:text-brand-300 size-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14m-7-7 7 7-7 7"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/validar-cfdi-xml"
            class="group focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 flex min-h-11 items-center justify-between gap-3 rounded-sm py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-5 sm:py-5"
          >
            <div>
              <h3
                class="group-hover:text-brand-800 dark:group-hover:text-brand-300 text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              >
                Validar estructura de CFDI XML
              </h3>
              <p
                class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                Revisa la estructura del CFDI 4.0 y sus complementos contra los
                esquemas XSD.
              </p>
            </div>
            <svg
              aria-hidden="true"
              class="text-brand-800 dark:text-brand-300 size-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14m-7-7 7 7-7 7"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
