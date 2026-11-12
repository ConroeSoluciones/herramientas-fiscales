<script setup lang="ts">
interface ExchangeRateRecord {
  codNota: number
  publicationDate: string
  rateDate: string
  pesosPerDollar: number
  title: string
  sourceUrl: string
}

const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Historial del tipo de cambio dólar a peso mexicano',
  description:
    'Consulta el tipo de cambio oficial del dólar a peso mexicano por fecha y revisa su historial mensual.',
  ogTitle: `Historial del tipo de cambio dólar MXN | ${publicConfig.siteName}`,
  ogDescription:
    'Consulta el tipo de cambio oficial del dólar estadounidense a peso mexicano por fecha.',
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/tipo-de-cambio-dolar-mxn')

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function getMexicoToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value

  return `${part('year')}-${part('month')}-${part('day')}`
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(date)
}

function formatRate(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}

const today = getMexicoToday()
const selectedDate = ref(today)
const visibleMonth = ref(today.slice(0, 7))
const historyQuery = computed(() => ({ mes: visibleMonth.value }))

const {
  data: history,
  status: historyStatus,
  error: historyError,
  refresh: refreshHistory,
} = await useFetch<ExchangeRateRecord[]>('/api/tipo-cambio/historial', {
  key: 'exchange-rate-history',
  query: historyQuery,
  default: () => [],
})

if (history.value[0]) selectedDate.value = history.value[0].rateDate

watch(history, (records) => {
  if (
    selectedDate.value === `${visibleMonth.value}-01` &&
    records?.[0]?.rateDate.startsWith(visibleMonth.value)
  ) {
    selectedDate.value = records[0].rateDate
  }
})

const selectedRate = computed(() =>
  history.value.find((record) => record.rateDate === selectedDate.value),
)

const monthTitle = computed(() => {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, 1)))
})

const calendarDays = computed(() => {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(year!, month! - 1, 1)).getUTCDay()
  const numberOfDays = new Date(Date.UTC(year!, month!, 0)).getUTCDate()
  const cellCount = Math.ceil((firstWeekday + numberOfDays) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year!, month! - 1, index - firstWeekday + 1))
    const isoDate = toIsoDate(date)

    return {
      date: isoDate,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month! - 1,
      isFuture: isoDate > today,
      hasRate: history.value.some((record) => record.rateDate === isoDate),
    }
  })
})

function changeMonth(amount: number) {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const nextMonth = new Date(Date.UTC(year!, month! - 1 + amount, 1))
  const nextMonthValue = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`
  visibleMonth.value = nextMonthValue
  selectedDate.value = `${nextMonthValue}-01`
}

function selectCalendarDate(date: string) {
  selectedDate.value = date
  if (date.slice(0, 7) !== visibleMonth.value)
    visibleMonth.value = date.slice(0, 7)
}
</script>

<template>
  <section aria-labelledby="tipo-cambio-titulo" class="pb-12">
    <header class="mx-auto max-w-4xl pt-3 text-center">
      <h1
        id="tipo-cambio-titulo"
        class="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
      >
        Tipo de cambio dólar a peso mexicano
      </h1>
      <p
        class="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300"
      >
        Consulta el tipo de cambio oficial por fecha. Selecciona un día del
        calendario para ver su valor.
      </p>
    </header>

    <article
      aria-label="Tipo de cambio de la fecha seleccionada"
      aria-live="polite"
      class="border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/50 mx-auto mt-6 max-w-2xl rounded-2xl border px-5 py-6 text-center shadow-sm sm:px-8 sm:py-7"
    >
      <p
        class="text-brand-900 dark:text-brand-200 text-sm font-semibold tracking-[0.16em] uppercase"
      >
        {{ formatDate(selectedDate) }}
      </p>
      <p
        v-if="selectedRate"
        class="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl dark:text-white"
      >
        {{ formatRate(selectedRate.pesosPerDollar) }}
      </p>
      <p
        v-else-if="historyStatus === 'pending'"
        class="mt-3 text-xl font-semibold text-slate-500 sm:text-2xl dark:text-slate-300"
      >
        Cargando…
      </p>
      <p
        v-else-if="historyError"
        class="mt-3 text-xl font-semibold text-slate-600 dark:text-slate-300"
      >
        Dato temporalmente no disponible
      </p>
      <p
        v-else
        class="mt-3 text-xl font-semibold text-slate-600 dark:text-slate-300"
      >
        Sin publicación para esta fecha
      </p>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Pesos mexicanos por dólar estadounidense
      </p>
      <p
        v-if="selectedRate"
        class="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300"
      >
        Fecha de publicación: {{ formatDate(selectedRate.publicationDate) }}
        <span aria-hidden="true">·</span>
        <a
          :href="selectedRate.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-brand-800 decoration-brand-400 hover:text-brand-950 dark:text-brand-200 font-semibold underline underline-offset-4 dark:hover:text-white"
        >
          Ver fuente oficial
        </a>
      </p>
      <p
        v-else-if="historyError"
        role="alert"
        class="mt-4 text-sm font-medium text-rose-800 dark:text-rose-300"
      >
        No fue posible cargar el historial. Intenta de nuevo más tarde.
      </p>
    </article>

    <div
      class="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]"
    >
      <section
        aria-labelledby="calendario-titulo"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <h2
            id="calendario-titulo"
            class="text-xl font-semibold text-slate-950 capitalize dark:text-white"
          >
            {{ monthTitle }}
          </h2>
          <div class="flex gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 grid size-10 place-items-center rounded-lg border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              @click="changeMonth(-1)"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              :disabled="visibleMonth >= today.slice(0, 7)"
              class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 grid size-10 place-items-center rounded-lg border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              @click="changeMonth(1)"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>

        <div aria-label="Calendario de tipo de cambio">
          <div class="mb-2 grid grid-cols-7 text-center">
            <span
              v-for="weekday in [
                'Dom',
                'Lun',
                'Mar',
                'Mié',
                'Jue',
                'Vie',
                'Sáb',
              ]"
              :key="weekday"
              class="py-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              {{ weekday }}
            </span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="day in calendarDays"
              :key="day.date"
              type="button"
              :aria-label="`${formatDate(day.date)}${day.hasRate ? ', tipo de cambio disponible' : ''}`"
              :aria-pressed="selectedDate === day.date"
              :disabled="day.isFuture"
              class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 relative mx-auto grid size-10 place-items-center rounded-full text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
              :class="[
                day.inMonth
                  ? 'text-slate-800 dark:text-slate-100'
                  : 'text-slate-400 dark:text-slate-600',
                selectedDate === day.date
                  ? 'bg-brand-700 dark:bg-brand-300 font-bold text-white dark:text-slate-950'
                  : 'hover:bg-brand-50 dark:hover:bg-slate-800',
              ]"
              @click="selectCalendarDate(day.date)"
            >
              {{ day.day }}
              <span
                v-if="day.hasRate && selectedDate !== day.date"
                aria-hidden="true"
                class="bg-brand-600 dark:bg-brand-300 absolute bottom-1 size-1 rounded-full"
              />
            </button>
          </div>
        </div>
        <p class="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Los puntos indican los días con un tipo de cambio publicado.
        </p>
      </section>

      <section
        aria-labelledby="historial-titulo"
        class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="historial-titulo"
              class="text-xl font-semibold text-slate-950 dark:text-white"
            >
              Historial del mes
            </h2>
            <p
              class="mt-1 text-sm text-slate-500 capitalize dark:text-slate-400"
            >
              {{ monthTitle }}
            </p>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Más reciente primero
          </p>
        </div>

        <p
          v-if="historyStatus === 'pending'"
          role="status"
          class="rounded-xl bg-slate-50 p-5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Cargando historial…
        </p>
        <div
          v-else-if="historyError"
          role="alert"
          class="rounded-xl bg-rose-50 p-5 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        >
          <p>No fue posible cargar el historial.</p>
          <button
            type="button"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 mt-3 rounded-lg border border-rose-300 px-3 py-2 font-semibold hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-rose-800 dark:hover:bg-rose-900"
            @click="refreshHistory()"
          >
            Reintentar
          </button>
        </div>
        <p
          v-else-if="history.length === 0"
          class="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          No hay tipos de cambio registrados para este mes.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[28rem] text-left text-sm">
            <thead
              class="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400"
            >
              <tr>
                <th scope="col" class="pr-4 pb-3 font-semibold">Fecha</th>
                <th scope="col" class="pr-4 pb-3 font-semibold">
                  Tipo de cambio
                </th>
                <th scope="col" class="pb-3 text-right font-semibold">
                  Fuente
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="record in history"
                :key="record.codNota"
                :class="
                  selectedDate === record.rateDate
                    ? 'bg-brand-50 dark:bg-brand-950/40'
                    : ''
                "
              >
                <td
                  class="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200"
                >
                  <button
                    type="button"
                    class="hover:text-brand-800 hover:decoration-brand-400 focus-visible:outline-brand-700 dark:hover:text-brand-200 dark:focus-visible:outline-brand-300 rounded text-left underline decoration-transparent underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    :aria-pressed="selectedDate === record.rateDate"
                    @click="selectCalendarDate(record.rateDate)"
                  >
                    {{
                      formatDate(record.rateDate, {
                        day: '2-digit',
                        month: 'short',
                      })
                    }}
                  </button>
                </td>
                <td
                  class="py-3 pr-4 font-semibold text-slate-950 tabular-nums dark:text-white"
                >
                  {{ formatRate(record.pesosPerDollar) }}
                </td>
                <td class="py-3 text-right">
                  <a
                    :href="record.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :aria-label="`Abrir fuente oficial para el ${formatDate(record.rateDate)}`"
                    class="text-brand-800 decoration-brand-300 hover:text-brand-950 dark:text-brand-200 font-semibold underline underline-offset-4 dark:hover:text-white"
                    @click.stop
                  >
                    SIDOF
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>
