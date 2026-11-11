<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'

type InputMode = 'manual' | 'xml'

interface TenureResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalWeeks: number
}

const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Calculadora de antigüedad laboral para CFDI de nómina',
  description:
    'Calcula la antigüedad laboral entre dos fechas y genera los formatos válidos para el atributo Antigüedad del CFDI de nómina 1.2.',
  ogTitle: `Calculadora de antigüedad laboral | ${publicConfig.siteName}`,
  ogDescription:
    'Calcula la antigüedad desde una fecha manual o un XML de nómina y consulta el formato para CFDI.',
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/calculadora-antiguedad-laboral')

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

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function dateForPicker(value: string): Date | null {
  const date = parseIsoDate(value)
  if (!date) return null

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function isoDateFromPicker(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function addMonths(date: Date, months: number): Date {
  const monthIndex = date.getUTCMonth() + months
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month))

  return new Date(Date.UTC(year, month, day))
}

function differenceInDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function calculateTenure(
  startValue: string,
  endValue: string,
): TenureResult | null {
  const start = parseIsoDate(startValue)
  const end = parseIsoDate(endValue)
  if (!start || !end || end < start) return null

  let years = end.getUTCFullYear() - start.getUTCFullYear()
  if (addMonths(start, years * 12) > end) years -= 1

  let months = 0
  while (months < 11 && addMonths(start, years * 12 + months + 1) <= end) {
    months += 1
  }

  const completedMonths = addMonths(start, years * 12 + months)
  const totalDays = differenceInDays(start, end)

  return {
    years,
    months,
    days: differenceInDays(completedMonths, end),
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
  }
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = parseIsoDate(value)
  if (!date) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(date)
}

function plural(value: number, singular: string, pluralForm: string): string {
  return `${value} ${value === 1 ? singular : pluralForm}`
}

function formatDuration(result: TenureResult): string {
  if (result.years === 0 && result.months === 0) {
    return plural(result.days, 'día', 'días')
  }

  return [
    result.years ? plural(result.years, 'año', 'años') : '',
    result.months ? plural(result.months, 'mes', 'meses') : '',
    result.days ? plural(result.days, 'día', 'días') : '',
  ]
    .filter(Boolean)
    .join(', ')
}

const today = getMexicoToday()
const inputMode = ref<InputMode>('manual')
const startDate = ref('')
const calculationDate = ref(today)
const colorMode = useColorMode()
const hasCalculated = ref(false)
const validationMessage = ref('')
const xmlMessage = ref('')
const xmlError = ref('')
const isReadingXml = ref(false)
const copiedFormat = ref('')
const xmlInput = ref<HTMLInputElement | null>(null)

const startPickerDate = computed<Date | null>({
  get: () => dateForPicker(startDate.value),
  set: (value) => updateDate(value ? isoDateFromPicker(value) : ''),
})

const calculationPickerDate = computed<Date | null>({
  get: () => dateForPicker(calculationDate.value),
  set: (value) => {
    calculationDate.value = value ? isoDateFromPicker(value) : ''
  },
})

const maxStartPickerDate = computed(
  () => dateForPicker(calculationDate.value) ?? undefined,
)
const maxCalculationPickerDate = dateForPicker(today) ?? undefined
const isDarkMode = computed(() => colorMode.value === 'dark')

const tenure = computed(() =>
  hasCalculated.value
    ? calculateTenure(startDate.value, calculationDate.value)
    : null,
)

const formattedTenure = computed(() =>
  tenure.value ? formatDuration(tenure.value) : '',
)

const combinedCfdiFormat = computed(() => {
  if (!tenure.value) return ''
  const { years, months, days } = tenure.value
  const parts = `${years ? `${years}Y` : ''}${months ? `${months}M` : ''}${days ? `${days}D` : ''}`
  return `P${parts || '0D'}`
})

const cfdiFormats = computed(() => {
  if (!tenure.value) return []

  return [
    {
      type: 'Días',
      pattern: 'P{Días}D',
      value: `P${tenure.value.totalDays}D`,
      color: 'text-slate-900 dark:text-white',
    },
    {
      type: 'Semanas',
      pattern: 'P{Semanas}W',
      value: `P${tenure.value.totalWeeks}W`,
      color: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      type: 'Días, meses y años',
      pattern: 'P{Años}Y{Meses}M{Días}D',
      value: combinedCfdiFormat.value,
      color: 'text-amber-700 dark:text-amber-300',
    },
  ]
})

const vacationTable = [
  { years: 1, days: 12 },
  { years: 2, days: 14 },
  { years: 3, days: 16 },
  { years: 4, days: 18 },
  { years: 5, days: 20 },
]

function calculate() {
  validationMessage.value = ''
  const start = parseIsoDate(startDate.value)
  const end = parseIsoDate(calculationDate.value)

  if (!start) {
    validationMessage.value = 'Ingresa una fecha de inicio válida.'
    hasCalculated.value = false
    return
  }

  if (!end) {
    validationMessage.value = 'Ingresa una fecha de cálculo válida.'
    hasCalculated.value = false
    return
  }

  if (start > end) {
    validationMessage.value =
      'La fecha de inicio no puede ser posterior a la fecha de cálculo.'
    hasCalculated.value = false
    return
  }

  hasCalculated.value = true
}

function resetCalculator() {
  startDate.value = ''
  calculationDate.value = today
  hasCalculated.value = false
  validationMessage.value = ''
  xmlMessage.value = ''
  xmlError.value = ''
  if (xmlInput.value) xmlInput.value.value = ''
}

function updateDate(value: string) {
  startDate.value = value
  hasCalculated.value = false
  validationMessage.value = ''
  xmlError.value = ''
}

async function readPayrollXml(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  xmlError.value = ''
  xmlMessage.value = ''
  hasCalculated.value = false
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.xml')) {
    xmlError.value = 'Selecciona un archivo XML de nómina.'
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    xmlError.value = 'El archivo no debe superar los 5 MB.'
    input.value = ''
    return
  }

  isReadingXml.value = true
  try {
    const xmlText = await file.text()
    const document = new DOMParser().parseFromString(xmlText, 'application/xml')
    if (document.getElementsByTagName('parsererror').length > 0) {
      throw new Error(
        'No se pudo leer el XML. Verifica que el archivo esté completo.',
      )
    }

    const recipient = Array.from(document.getElementsByTagName('*')).find(
      (element) =>
        element.localName.toLowerCase() === 'receptor' &&
        element.hasAttribute('FechaInicioRelLaboral'),
    )
    const rawDate = recipient?.getAttribute('FechaInicioRelLaboral') ?? ''
    const isoDate = rawDate.slice(0, 10)

    if (!parseIsoDate(isoDate)) {
      throw new Error(
        'No encontramos una FechaInicioRelLaboral válida en el complemento de nómina.',
      )
    }

    updateDate(isoDate)
    xmlMessage.value = `Fecha de ingreso detectada en ${file.name}.`
  } catch (error) {
    xmlError.value =
      error instanceof Error
        ? error.message
        : 'No fue posible leer el XML de nómina.'
  } finally {
    isReadingXml.value = false
  }
}

async function copyFormat(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copiedFormat.value = label
    window.setTimeout(() => {
      if (copiedFormat.value === label) copiedFormat.value = ''
    }, 2200)
  } catch {
    copiedFormat.value = ''
    validationMessage.value =
      'No fue posible copiar. Selecciona y copia el formato manualmente.'
  }
}

watch([startDate, calculationDate], () => {
  hasCalculated.value = false
})
</script>

<template>
  <section aria-labelledby="antiguedad-titulo" class="pb-12">
    <header class="mx-auto max-w-4xl pt-3 text-center">
      <h1
        id="antiguedad-titulo"
        class="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
      >
        Calculadora de Antigüedad Laboral
      </h1>
      <p
        class="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300"
      >
        Calcula la antigüedad de un trabajador desde el CFDI de nómina o
        ingresando la fecha manualmente. Obtén los formatos del complemento de
        Nómina y consulta prestaciones de referencia según la LFT.
      </p>
    </header>

    <!-- eslint-disable vue/html-self-closing -->
    <div
      class="mx-auto mt-8 grid max-w-6xl gap-7 lg:grid-cols-2 lg:items-start"
    >
      <section
        aria-labelledby="datos-calculo-titulo"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          aria-label="Origen de la fecha de ingreso"
          class="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          role="tablist"
        >
          <button
            id="manual-tab"
            type="button"
            role="tab"
            :aria-selected="inputMode === 'manual'"
            aria-controls="manual-panel"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 rounded-lg px-2 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 sm:text-base"
            :class="
              inputMode === 'manual'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            "
            @click="inputMode = 'manual'"
          >
            <span aria-hidden="true">▦</span>
            Ingresar fecha manual
          </button>
          <button
            id="xml-tab"
            type="button"
            role="tab"
            :aria-selected="inputMode === 'xml'"
            aria-controls="xml-panel"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 rounded-lg px-2 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 sm:text-base"
            :class="
              inputMode === 'xml'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            "
            @click="inputMode = 'xml'"
          >
            <span aria-hidden="true">▤</span>
            Desde XML de nómina
          </button>
        </div>

        <div class="mt-7 flex items-start gap-3">
          <span
            aria-hidden="true"
            class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-xl"
          >
            ▦
          </span>
          <div>
            <h2
              id="datos-calculo-titulo"
              class="text-lg font-semibold text-slate-950 dark:text-white"
            >
              Datos para el cálculo
            </h2>
            <p
              class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              Ingresa la fecha de inicio de la relación laboral para calcular la
              antigüedad.
            </p>
          </div>
        </div>

        <div
          v-show="inputMode === 'manual'"
          id="manual-panel"
          role="tabpanel"
          aria-labelledby="manual-tab"
          class="mt-6"
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="block">
              <span
                class="mb-2 block text-sm leading-6 font-medium text-slate-800 dark:text-slate-200"
              >
                Fecha de ingreso (inicio de relación laboral)
              </span>
              <VueDatePicker
                v-model="startPickerDate"
                :locale="es"
                :dark="isDarkMode"
                :formats="{ input: 'dd/MM/yyyy' }"
                :text-input="{ format: 'dd/MM/yyyy' }"
                placeholder="dd/mm/aaaa"
                :max-date="maxStartPickerDate"
                :input-attrs="{
                  id: 'fecha-ingreso',
                  required: true,
                  clearable: false,
                }"
                :enable-time-picker="false"
                :auto-apply="true"
                :hide-offset-dates="true"
                :week-start="1"
                class="cs-date-picker"
              />
              <span
                class="mt-2 block text-xs text-slate-500 dark:text-slate-400"
              >
                Formato: dd/mm/aaaa (ej. 15/04/2020)
              </span>
            </label>

            <label class="block">
              <span
                class="mb-2 block text-sm leading-6 font-medium text-slate-800 dark:text-slate-200"
              >
                Fecha de cálculo (día para antigüedad)
              </span>
              <VueDatePicker
                v-model="calculationPickerDate"
                :locale="es"
                :dark="isDarkMode"
                :formats="{ input: 'dd/MM/yyyy' }"
                :text-input="{ format: 'dd/MM/yyyy' }"
                placeholder="dd/mm/aaaa"
                :max-date="maxCalculationPickerDate"
                :input-attrs="{
                  id: 'fecha-calculo',
                  required: true,
                  clearable: false,
                }"
                :enable-time-picker="false"
                :auto-apply="true"
                :hide-offset-dates="true"
                :week-start="1"
                class="cs-date-picker"
              />
              <span
                class="mt-2 block text-xs text-slate-500 dark:text-slate-400"
              >
                Formato: dd/mm/aaaa (ej. 15/04/2020)
              </span>
              <button
                type="button"
                class="hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-brand-700 dark:hover:border-brand-700 dark:focus-visible:outline-brand-300 mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="calculationDate = today"
              >
                Usar fecha de hoy
              </button>
            </label>
          </div>
        </div>

        <div
          v-show="inputMode === 'xml'"
          id="xml-panel"
          role="tabpanel"
          aria-labelledby="xml-tab"
          class="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950"
        >
          <h3 class="font-semibold text-slate-950 dark:text-white">
            Leer fecha de ingreso desde el XML
          </h3>
          <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            El archivo se procesa en tu navegador. No se envía ni se guarda en
            nuestros servidores.
          </p>
          <input
            ref="xmlInput"
            type="file"
            accept=".xml,text/xml,application/xml"
            class="sr-only"
            aria-label="Seleccionar XML de nómina"
            @change="readPayrollXml"
          />
          <button
            type="button"
            :disabled="isReadingXml"
            class="border-brand-300 text-brand-900 hover:bg-brand-50 focus-visible:outline-brand-700 dark:border-brand-800 dark:text-brand-200 dark:focus-visible:outline-brand-300 mt-4 rounded-xl border bg-white px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-slate-800"
            @click="xmlInput?.click()"
          >
            {{ isReadingXml ? 'Leyendo archivo…' : 'Seleccionar archivo XML' }}
          </button>
          <p
            v-if="xmlMessage"
            role="status"
            class="mt-3 text-sm font-medium text-emerald-800 dark:text-emerald-300"
          >
            {{ xmlMessage }}
          </p>
          <p
            v-if="xmlError"
            role="alert"
            class="mt-3 text-sm font-medium text-rose-800 dark:text-rose-300"
          >
            {{ xmlError }}
          </p>
        </div>

        <p
          v-if="validationMessage"
          role="alert"
          class="mt-4 text-sm font-medium text-rose-800 dark:text-rose-300"
        >
          {{ validationMessage }}
        </p>

        <div class="mt-6 flex gap-3">
          <button
            type="button"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 bg-brand-900 hover:bg-brand-800 dark:bg-brand-700 dark:hover:bg-brand-600 flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="calculate"
          >
            <span aria-hidden="true">▦</span>
            Calcular antigüedad
          </button>
          <button
            type="button"
            aria-label="Reiniciar calculadora"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 grid size-12 shrink-0 place-items-center rounded-xl border border-slate-300 text-lg text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="resetCalculator"
          >
            ↺
          </button>
        </div>
      </section>

      <section
        v-if="tenure"
        aria-labelledby="resultado-titulo"
        aria-live="polite"
        class="space-y-5"
      >
        <article
          class="rounded-2xl bg-emerald-700 p-6 text-white shadow-sm sm:p-7"
        >
          <p
            class="flex items-center gap-2 text-sm font-medium text-emerald-50"
          >
            <span aria-hidden="true">◷</span>
            Antigüedad laboral
          </p>
          <h2
            id="resultado-titulo"
            class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {{ formattedTenure }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-emerald-50 sm:text-base">
            Desde {{ formatDate(startDate) }} hasta
            {{ formatDate(calculationDate) }}
          </p>
        </article>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article
            v-for="unit in [
              { label: 'Años', value: tenure.years },
              { label: 'Meses', value: tenure.months },
              { label: 'Días', value: tenure.days },
              { label: 'Total semanas', value: tenure.totalWeeks },
            ]"
            :key="unit.label"
            class="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ unit.label }}
            </p>
            <p
              class="mt-1 text-2xl font-semibold text-slate-950 tabular-nums dark:text-white"
            >
              {{ unit.value }}
            </p>
          </article>
        </div>

        <article
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-start gap-3">
            <span
              aria-hidden="true"
              class="text-brand-800 dark:text-brand-200 mt-0.5 text-lg"
            >
              ▤
            </span>
            <div>
              <h3 class="font-semibold text-slate-950 dark:text-white">
                Formatos CFDI de Nómina 1.2
              </h3>
              <p
                class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                Patrones para el atributo Antigüedad del complemento de Nómina.
              </p>
            </div>
          </div>

          <div
            class="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div
              class="grid grid-cols-[0.9fr_1.3fr_auto] gap-2 bg-slate-100 px-3 py-3 text-xs font-medium text-slate-600 sm:px-4 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>Tipo</span>
              <span>Patrón</span>
              <span class="text-right">Antigüedad</span>
            </div>
            <div
              v-for="item in cfdiFormats"
              :key="item.type"
              class="grid grid-cols-[0.9fr_1.3fr_auto] items-center gap-2 border-t border-slate-200 px-3 py-3 text-xs sm:px-4 sm:text-sm dark:border-slate-700"
            >
              <span class="text-slate-800 dark:text-slate-200">{{
                item.type
              }}</span>
              <code class="truncate text-slate-500 dark:text-slate-400">
                {{ item.pattern }}
              </code>
              <span class="flex items-center justify-end gap-1.5">
                <code :class="['font-semibold', item.color]">{{
                  item.value
                }}</code>
                <button
                  type="button"
                  :aria-label="`Copiar formato ${item.type}`"
                  class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 rounded p-1 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-slate-200 dark:hover:bg-slate-800"
                  @click="copyFormat(item.type, item.value)"
                >
                  {{ copiedFormat === item.type ? '✓' : '▢' }}
                </button>
              </span>
            </div>
          </div>

          <p
            v-if="copiedFormat"
            role="status"
            class="mt-2 text-right text-xs font-medium text-emerald-800 dark:text-emerald-300"
          >
            Formato de {{ copiedFormat.toLowerCase() }} copiado.
          </p>

          <div class="mt-4 grid gap-2 sm:grid-cols-3">
            <div
              class="rounded-xl bg-slate-100 p-3 text-center dark:bg-slate-800"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Total de días
              </p>
              <p
                class="mt-1 font-semibold text-slate-950 tabular-nums dark:text-white"
              >
                {{ tenure.totalDays }}
              </p>
            </div>
            <div
              class="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/40"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Total de semanas
              </p>
              <p
                class="mt-1 font-semibold text-emerald-800 tabular-nums dark:text-emerald-200"
              >
                {{ tenure.totalWeeks }}
              </p>
            </div>
            <div
              class="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/40"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Años / meses / días
              </p>
              <p
                class="mt-1 font-semibold text-slate-950 tabular-nums dark:text-white"
              >
                {{ tenure.years }} / {{ tenure.months }} / {{ tenure.days }}
              </p>
            </div>
          </div>

          <p
            class="mt-4 rounded-lg border border-slate-200 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <strong class="text-slate-900 dark:text-white">Nota:</strong>
            Los formatos corresponden a patrones del esquema XSD del complemento
            de Nómina 1.2. Confirma con tu PAC cuál formato requiere tu sistema.
          </p>
        </article>

        <article
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-start gap-3">
            <span aria-hidden="true" class="text-lg">♧</span>
            <div>
              <h3 class="font-semibold text-slate-950 dark:text-white">
                Prestaciones según LFT
              </h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Días mínimos de vacaciones por año cumplido (reforma 2023).
              </p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div
              class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40"
            >
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Vacaciones
              </p>
              <p
                class="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-200"
              >
                12
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                días desde 1 año
              </p>
            </div>
            <div
              class="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40"
            >
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Prima vacacional
              </p>
              <p
                class="mt-1 text-xl font-semibold text-amber-800 dark:text-amber-200"
              >
                25%
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                mínimo legal
              </p>
            </div>
            <div
              class="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Aguinaldo
              </p>
              <p
                class="mt-1 text-xl font-semibold text-slate-900 dark:text-white"
              >
                15
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                días mínimo
              </p>
            </div>
          </div>

          <h4 class="mt-5 text-sm font-medium text-slate-900 dark:text-white">
            Tabla de vacaciones LFT
          </h4>
          <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div
              v-for="row in vacationTable"
              :key="row.years"
              class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 text-center dark:border-slate-700 dark:bg-slate-800"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ row.years }} {{ row.years === 1 ? 'año' : 'años' }}
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-950 dark:text-white"
              >
                {{ row.days }} días
              </p>
            </div>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Desde el sexto año se agregan 2 días por cada bloque de 5 años
            adicionales.
          </p>
        </article>
      </section>

      <section
        v-else
        aria-live="polite"
        class="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 text-center lg:min-h-96 dark:border-slate-700 dark:bg-slate-900/60"
      >
        <span
          aria-hidden="true"
          class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 grid size-20 place-items-center rounded-full text-4xl"
        >
          ◷
        </span>
        <p
          class="mt-5 max-w-sm text-base leading-7 text-slate-600 dark:text-slate-300"
        >
          Ingresa la fecha de inicio para calcular la antigüedad.
        </p>
      </section>
    </div>
    <!-- eslint-enable vue/html-self-closing -->

    <aside
      class="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <h2
        class="flex items-center gap-2 font-semibold text-slate-950 dark:text-white"
      >
        <span aria-hidden="true" class="text-amber-700 dark:text-amber-300"
          >⚠</span
        >
        Aviso legal importante
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        Esta calculadora es una herramienta informativa y de referencia para
        simulación. Los resultados son aproximados y no constituyen asesoría
        fiscal, contable o legal.
      </p>
      <p class="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
        El uso e interpretación de los resultados es responsabilidad del
        usuario. Para cálculos oficiales de nómina, consulta a un especialista.
      </p>
    </aside>

    <div class="mt-6 grid gap-4 md:grid-cols-2">
      <article
        class="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 class="font-semibold text-slate-950 dark:text-white">Base legal</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Referencia al Anexo 20 del SAT para el complemento de Nómina 1.2 y a
          los artículos 76, 80, 87 y 162 de la Ley Federal del Trabajo.
        </p>
      </article>
      <article
        class="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 class="font-semibold text-slate-950 dark:text-white">
          Consideraciones
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Los formatos se basan en patrones del esquema XSD de Nómina 1.2.
          Verifica con tu PAC la integración correcta del CFDI.
        </p>
      </article>
    </div>

    <section aria-labelledby="como-usar-titulo" class="mt-10">
      <h2
        id="como-usar-titulo"
        class="text-xl font-semibold text-slate-950 dark:text-white"
      >
        Cómo usar esta calculadora
      </h2>
      <ol class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li
          class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            class="bg-brand-900 dark:bg-brand-700 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            >1</span
          >
          <div>
            <h3 class="font-medium text-slate-950 dark:text-white">
              Ingresa la fecha de inicio
            </h3>
            <p
              class="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              Indica la fecha de ingreso o cárgala desde el XML de nómina.
            </p>
          </div>
        </li>
        <li
          class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            class="bg-brand-900 dark:bg-brand-700 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            >2</span
          >
          <div>
            <h3 class="font-medium text-slate-950 dark:text-white">
              Selecciona fecha de cálculo
            </h3>
            <p
              class="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              Puedes usar la fecha de hoy o elegir un día específico.
            </p>
          </div>
        </li>
        <li
          class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            class="bg-brand-900 dark:bg-brand-700 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            >3</span
          >
          <div>
            <h3 class="font-medium text-slate-950 dark:text-white">
              Calcula la antigüedad
            </h3>
            <p
              class="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              Consulta años, meses, días, semanas y días totales.
            </p>
          </div>
        </li>
        <li
          class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            class="bg-brand-900 dark:bg-brand-700 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            >4</span
          >
          <div>
            <h3 class="font-medium text-slate-950 dark:text-white">
              Copia el formato CFDI
            </h3>
            <p
              class="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              Usa el formato correspondiente en el atributo Antigüedad de tu
              nómina.
            </p>
          </div>
        </li>
      </ol>
    </section>
  </section>
</template>
