<script setup lang="ts">
import {
  CFDI_NAMESPACE,
  getFriendlyXsdMessage,
  getXmlElementPath,
  parseCfdiXml,
} from '~/utils/cfdi-xml-parser'
import {
  loadCfdiSchemaGraph,
  removeXmlSchemaHints,
} from '~/utils/cfdi-xsd-loader'

type ValidationStatus =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'partial'
  | 'unsupported'
  | 'failed'

interface ValidationIssue {
  id: number
  message: string
  rawMessage: string
  path: string[]
  lineNumber?: number
  columnNumber?: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const { public: publicConfig } = useRuntimeConfig()

useSeoMeta({
  title: 'Validador de CFDI XML',
  description:
    'Valida la estructura de un CFDI 4.0 y sus complementos contra los esquemas XSD oficiales del SAT.',
  ogTitle: `Validador de CFDI XML | ${publicConfig.siteName}`,
  ogDescription:
    'Revisa la estructura de un CFDI XML y localiza cada error desde la raíz hasta el nodo afectado.',
  ogType: 'website',
  twitterCard: 'summary',
})

useCanonicalUrl('/validar-cfdi-xml')

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const fileError = ref('')
const validationStatus = ref<ValidationStatus>('idle')
const validationIssues = ref<ValidationIssue[]>([])
const unresolvedSchemas = ref<string[]>([])
const failureMessage = ref('')
const isDragging = ref(false)
let validationGeneration = 0

const formattedFileSize = computed(() => {
  const size = selectedFile.value?.size
  if (size === undefined) return ''

  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 1,
  }).format(size / 1024)
})

const resultHeading = computed(() => {
  switch (validationStatus.value) {
    case 'valid':
      return 'La estructura del CFDI es válida'
    case 'invalid':
      return validationIssues.value.length === 1
        ? 'Encontramos un error estructural'
        : `Encontramos ${validationIssues.value.length} errores estructurales`
    case 'partial':
      return 'La validación quedó parcial'
    case 'unsupported':
      return 'No se pudo validar este archivo'
    case 'failed':
      return 'No se pudo completar la validación'
    default:
      return ''
  }
})

const resultDescription = computed(() => {
  switch (validationStatus.value) {
    case 'valid':
      return 'El CFDI 4.0 y los esquemas de los complementos detectados no presentan errores estructurales.'
    case 'invalid':
      return 'Revisa cada ruta para localizar el nodo o atributo que no cumple con su XSD.'
    case 'partial':
      return 'El esquema principal se revisó, pero no se pudieron comprobar todos los complementos del archivo.'
    case 'unsupported':
      return 'Esta herramienta valida CFDI 4.0. No se aplicó un XSD de otra versión.'
    case 'failed':
      return failureMessage.value
    default:
      return ''
  }
})

const resultTone = computed(() => {
  if (validationStatus.value === 'valid') return 'success'
  if (validationStatus.value === 'partial') return 'warning'
  if (validationStatus.value === 'validating') return 'info'
  return 'error'
})

function resetValidation() {
  validationGeneration += 1
  selectedFile.value = null
  fileError.value = ''
  validationStatus.value = 'idle'
  validationIssues.value = []
  unresolvedSchemas.value = []
  failureMessage.value = ''
  isDragging.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function selectFile(file: File | undefined) {
  if (!file) return

  validationGeneration += 1
  validationIssues.value = []
  unresolvedSchemas.value = []
  failureMessage.value = ''
  validationStatus.value = 'idle'
  fileError.value = ''

  if (!file.name.toLowerCase().endsWith('.xml')) {
    selectedFile.value = null
    fileError.value = 'Selecciona un archivo con extensión .xml.'
    return
  }

  if (file.size === 0) {
    selectedFile.value = null
    fileError.value = 'El archivo está vacío.'
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    selectedFile.value = null
    fileError.value = 'El archivo no debe superar los 10 MB.'
    return
  }

  selectedFile.value = file
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectFile(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  selectFile(event.dataTransfer?.files?.[0])
}

function addIssue(
  message: string,
  rawMessage: string,
  path: string[],
  lineNumber?: number,
  columnNumber?: number,
) {
  validationIssues.value.push({
    id: validationIssues.value.length + 1,
    message,
    rawMessage,
    path,
    lineNumber,
    columnNumber,
  })
}

async function validateFile() {
  const file = selectedFile.value
  if (!file || validationStatus.value === 'validating') return

  const generation = ++validationGeneration
  validationStatus.value = 'validating'
  validationIssues.value = []
  unresolvedSchemas.value = []
  failureMessage.value = ''
  fileError.value = ''

  try {
    const xml = await file.text()
    if (generation !== validationGeneration) return

    const parsedXml = parseCfdiXml(xml)
    if (parsedXml.parseError) {
      const path = getXmlElementPath(
        parsedXml.nodes,
        parsedXml.parseError.lineNumber,
        parsedXml.parseError.message,
      )
      addIssue(
        'El archivo no está bien formado como XML.',
        parsedXml.parseError.message,
        path,
        parsedXml.parseError.lineNumber,
        parsedXml.parseError.columnNumber,
      )
      validationStatus.value = 'invalid'
      return
    }

    const root = parsedXml.root
    if (!root || root.localName !== 'Comprobante') {
      validationStatus.value = 'unsupported'
      addIssue(
        'La raíz del archivo no es el nodo Comprobante de un CFDI.',
        'Se esperaba un elemento raíz Comprobante.',
        root ? [root.name] : [],
        root?.startLine,
      )
      return
    }

    if (root.namespaceUri !== CFDI_NAMESPACE) {
      validationStatus.value = 'unsupported'
      addIssue(
        'El espacio de nombres no corresponde a CFDI 4.0.',
        `Espacio de nombres detectado: ${root.namespaceUri || '(sin espacio de nombres)'}`,
        [root.name],
        root.startLine,
      )
      return
    }

    const version = root.attributes.find(
      (attribute) => attribute.local === 'Version',
    )?.value
    if (version !== '4.0') {
      validationStatus.value = 'unsupported'
      addIssue(
        `La versión ${version ? `«${version}»` : 'del CFDI'} no está soportada.`,
        `El esquema disponible valida CFDI 4.0. Versión detectada: ${version || 'no indicada'}.`,
        [root.name, '@Version'],
        root.startLine,
      )
      return
    }

    const schemaGraph = await loadCfdiSchemaGraph(parsedXml)
    if (generation !== validationGeneration) return

    const { validateXML } = await import('xmllint-wasm')
    const result = await validateXML({
      xml: [
        {
          fileName: 'cfdi.xml',
          contents: removeXmlSchemaHints(xml, parsedXml),
        },
      ],
      schema: [schemaGraph.schema],
      preload: schemaGraph.preload,
      maxMemoryPages: 4096,
      modifyArguments: (args) => ['--nonet', ...args],
    })
    if (generation !== validationGeneration) return

    for (const [index, error] of result.errors.entries()) {
      const lineNumber = error.loc?.lineNumber
      addIssue(
        getFriendlyXsdMessage(error.message),
        error.rawMessage,
        getXmlElementPath(parsedXml.nodes, lineNumber, error.message),
        lineNumber,
      )
      validationIssues.value[index]!.id = index + 1
    }

    unresolvedSchemas.value = schemaGraph.unresolvedSchemas
    if (!result.valid) validationStatus.value = 'invalid'
    else if (schemaGraph.unresolvedSchemas.length > 0) {
      validationStatus.value = 'partial'
    } else validationStatus.value = 'valid'
  } catch {
    if (generation !== validationGeneration) return

    validationStatus.value = 'failed'
    failureMessage.value =
      'No se pudieron cargar o procesar los esquemas XSD. Revisa tu conexión e inténtalo de nuevo.'
  }
}

onBeforeUnmount(() => {
  validationGeneration += 1
})
</script>

<template>
  <section aria-labelledby="validador-titulo" class="pb-10">
    <header class="mx-auto max-w-3xl pt-2">
      <h1
        id="validador-titulo"
        class="text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
      >
        Validador de CFDI XML
      </h1>
      <p
        class="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300"
      >
        Revisa que un CFDI 4.0 y los complementos que contiene respeten su
        estructura XSD. Si hay errores, verás la ruta exacta desde la raíz.
      </p>
    </header>

    <div
      class="mx-auto mt-7 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start"
    >
      <section
        aria-labelledby="archivo-titulo"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-start gap-3">
          <span
            aria-hidden="true"
            class="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 16V4m0 0L7 9m5-5 5 5" />
              <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
            </svg>
          </span>
          <div>
            <h2
              id="archivo-titulo"
              class="text-lg font-semibold text-slate-950 dark:text-white"
            >
              Selecciona el archivo
            </h2>
            <p
              class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              Formato XML, hasta 10 MB.
            </p>
          </div>
        </div>

        <!-- eslint-disable vue/html-self-closing -->
        <input
          ref="fileInput"
          type="file"
          accept=".xml,text/xml,application/xml"
          class="sr-only"
          aria-label="Seleccionar archivo CFDI XML"
          @change="onFileChange"
        />
        <!-- eslint-enable vue/html-self-closing -->

        <div
          v-if="!selectedFile"
          class="mt-5 rounded-xl border border-dashed p-5 text-center transition sm:p-7"
          :class="
            isDragging
              ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/50'
              : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
          "
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <svg
            aria-hidden="true"
            class="text-brand-800 dark:text-brand-200 mx-auto size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
          </svg>
          <p class="mt-3 font-medium text-slate-900 dark:text-white">
            Arrastra aquí tu CFDI XML
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            o selecciónalo desde tu dispositivo
          </p>
          <button
            type="button"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            @click="fileInput?.click()"
          >
            Elegir archivo XML
          </button>
        </div>

        <div
          v-else
          class="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
        >
          <span
            aria-hidden="true"
            class="text-brand-800 dark:text-brand-200 grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"
              />
              <path d="M13 3v7h7M8 15h8M8 18h5" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <p
              class="text-sm font-semibold break-all text-slate-900 dark:text-white"
            >
              {{ selectedFile.name }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ formattedFileSize }} KB
            </p>
          </div>
          <button
            type="button"
            class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Quitar archivo seleccionado"
            :disabled="validationStatus === 'validating'"
            @click="resetValidation"
          >
            <svg
              aria-hidden="true"
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <p
          v-if="fileError"
          role="alert"
          class="mt-3 text-sm font-medium text-rose-800 dark:text-rose-300"
        >
          {{ fileError }}
        </p>

        <button
          type="button"
          class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 bg-brand-900 hover:bg-brand-800 dark:bg-brand-700 dark:hover:bg-brand-600 mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!selectedFile || validationStatus === 'validating'"
          @click="validateFile"
        >
          <svg
            v-if="validationStatus === 'validating'"
            aria-hidden="true"
            class="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="3"
            />
            <path
              class="opacity-90"
              fill="currentColor"
              d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6z"
            />
          </svg>
          {{
            validationStatus === 'validating'
              ? 'Validando estructura…'
              : 'Validar estructura XML'
          }}
        </button>

        <button
          v-if="
            selectedFile &&
            validationStatus !== 'idle' &&
            validationStatus !== 'validating'
          "
          type="button"
          class="focus-visible:outline-brand-700 dark:focus-visible:outline-brand-300 text-brand-800 decoration-brand-300 hover:text-brand-950 dark:text-brand-200 mt-2 min-h-11 w-full rounded-xl px-3 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-white"
          @click="resetValidation"
        >
          Validar otro archivo
        </button>

        <p
          role="note"
          class="mt-4 rounded-lg border border-slate-200 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          Tu XML se procesa en este navegador y no se envía ni se guarda en
          nuestros servidores. Los esquemas XSD oficiales se descargan cuando
          hacen falta y se guardan en la caché del navegador hasta por siete
          días, si está disponible.
        </p>
      </section>

      <section
        aria-labelledby="resultado-titulo"
        aria-live="polite"
        class="min-h-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        :aria-busy="validationStatus === 'validating'"
      >
        <template v-if="validationStatus === 'idle'">
          <div class="flex h-full min-h-60 flex-col justify-center">
            <p
              class="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400"
            >
              RESULTADO
            </p>
            <h2
              id="resultado-titulo"
              class="mt-2 text-xl font-semibold text-slate-950 dark:text-white"
            >
              Aquí aparecerá la validación
            </h2>
            <p
              class="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              Selecciona un archivo para comprobar su estructura y ver la ruta
              de cualquier error detectado.
            </p>
            <div class="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                Ejemplo de ruta
              </p>
              <p
                class="mt-2 font-mono text-xs leading-6 break-words text-slate-800 dark:text-slate-200"
              >
                cfdi:Comprobante → cfdi:Conceptos → cfdi:Concepto[2] →
                @ClaveProdServ
              </p>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            class="flex items-start gap-3 rounded-xl border p-4"
            :class="{
              'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40':
                resultTone === 'success',
              'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40':
                resultTone === 'warning',
              'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950':
                resultTone === 'info',
              'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40':
                resultTone === 'error',
            }"
          >
            <span
              aria-hidden="true"
              class="mt-0.5 grid size-7 shrink-0 place-items-center"
            >
              <svg
                v-if="resultTone === 'success'"
                class="size-6 text-emerald-700 dark:text-emerald-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 2.5 2.5L16 9" />
              </svg>
              <svg
                v-else-if="resultTone === 'warning'"
                class="size-6 text-amber-700 dark:text-amber-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2L12 3Z"
                />
                <path d="M12 9v4m0 3h.01" />
              </svg>
              <svg
                v-else-if="resultTone === 'info'"
                aria-hidden="true"
                class="text-brand-800 dark:text-brand-200 size-6 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-width="3"
                />
                <path
                  class="opacity-90"
                  fill="currentColor"
                  d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6z"
                />
              </svg>
              <svg
                v-else
                class="size-6 text-rose-700 dark:text-rose-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m9 9 6 6m0-6-6 6" />
              </svg>
            </span>
            <div class="min-w-0">
              <h2
                id="resultado-titulo"
                class="font-semibold"
                :class="{
                  'text-emerald-900 dark:text-emerald-100':
                    resultTone === 'success',
                  'text-amber-950 dark:text-amber-100':
                    resultTone === 'warning',
                  'text-brand-900 dark:text-brand-100': resultTone === 'info',
                  'text-rose-950 dark:text-rose-100': resultTone === 'error',
                }"
              >
                {{
                  validationStatus === 'validating'
                    ? 'Revisando los esquemas XSD…'
                    : resultHeading
                }}
              </h2>
              <p
                class="mt-1 text-sm leading-6"
                :class="{
                  'text-emerald-900 dark:text-emerald-200':
                    resultTone === 'success',
                  'text-amber-950 dark:text-amber-200':
                    resultTone === 'warning',
                  'text-slate-700 dark:text-slate-300': resultTone === 'info',
                  'text-rose-900 dark:text-rose-200': resultTone === 'error',
                }"
              >
                {{
                  validationStatus === 'validating'
                    ? 'El archivo permanece en tu navegador mientras se preparan los esquemas.'
                    : resultDescription
                }}
              </p>
            </div>
          </div>

          <div
            v-if="validationStatus === 'validating'"
            role="status"
            class="mt-5 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
          >
            <span
              aria-hidden="true"
              class="bg-brand-600 size-2 animate-pulse rounded-full"
            />
            Descargando o reutilizando los XSD oficiales para revisar el CFDI y
            sus complementos.
          </div>

          <div
            v-if="unresolvedSchemas.length > 0"
            class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <h3
              class="text-sm font-semibold text-amber-950 dark:text-amber-100"
            >
              Esquemas no verificados
            </h3>
            <p
              class="mt-1 text-xs leading-5 text-amber-900 dark:text-amber-200"
            >
              No se pudo cargar o comprobar el XSD de:
            </p>
            <ul
              class="mt-2 list-inside list-disc text-xs leading-5 break-all text-amber-950 dark:text-amber-100"
            >
              <li v-for="schema in unresolvedSchemas" :key="schema">
                {{ schema }}
              </li>
            </ul>
          </div>

          <section
            v-if="validationIssues.length > 0"
            aria-labelledby="errores-titulo"
            class="mt-6"
          >
            <div
              class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
            >
              <h3
                id="errores-titulo"
                class="text-base font-semibold text-slate-950 dark:text-white"
              >
                Errores encontrados
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ validationIssues.length }}
                {{ validationIssues.length === 1 ? 'resultado' : 'resultados' }}
              </p>
            </div>

            <ol class="mt-3 space-y-3">
              <li
                v-for="issue in validationIssues"
                :key="issue.id"
                class="rounded-xl border border-rose-200 bg-white p-4 dark:border-rose-900 dark:bg-slate-950"
              >
                <div
                  class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                >
                  <p
                    class="text-sm font-semibold text-rose-900 dark:text-rose-200"
                  >
                    {{ issue.message }}
                  </p>
                  <p
                    v-if="issue.lineNumber"
                    class="shrink-0 text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400"
                  >
                    Línea {{ issue.lineNumber
                    }}<template v-if="issue.columnNumber">
                      , columna {{ issue.columnNumber }}</template
                    >
                  </p>
                </div>

                <div
                  v-if="issue.path.length > 0"
                  class="mt-3 rounded-lg bg-rose-50/70 p-3 dark:bg-rose-950/30"
                >
                  <p
                    class="text-xs font-semibold tracking-wide text-rose-800 uppercase dark:text-rose-300"
                  >
                    Ruta del error
                  </p>
                  <ol
                    class="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 font-mono text-xs leading-6 text-slate-800 dark:text-slate-100"
                    aria-label="Ruta desde la raíz hasta el error"
                  >
                    <li
                      v-for="(segment, index) in issue.path"
                      :key="`${segment}-${index}`"
                      class="flex min-w-0 items-center gap-1"
                    >
                      <span
                        :class="
                          index === issue.path.length - 1
                            ? 'font-semibold text-rose-900 dark:text-rose-200'
                            : 'text-slate-700 dark:text-slate-200'
                        "
                      >
                        {{ segment }}
                      </span>
                      <svg
                        v-if="index < issue.path.length - 1"
                        aria-hidden="true"
                        class="size-3 shrink-0 text-slate-400"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="m6 3 5 5-5 5"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </li>
                  </ol>
                  <p
                    v-if="issue.path.some((segment) => segment.endsWith('[?]'))"
                    class="mt-2 text-xs leading-5 text-rose-900 dark:text-rose-200"
                  >
                    El XSD no indicó una columna para distinguir instancias
                    repetidas en el mismo renglón. Consulta el detalle técnico
                    para precisar cuál revisar.
                  </p>
                </div>

                <details
                  class="mt-3 text-xs text-slate-600 dark:text-slate-300"
                >
                  <summary
                    class="text-brand-800 decoration-brand-300 focus-visible:outline-brand-700 dark:text-brand-200 dark:focus-visible:outline-brand-300 w-fit cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Ver detalle técnico
                  </summary>
                  <pre
                    class="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 font-mono text-xs leading-5 break-words whitespace-pre-wrap dark:bg-slate-900"
                    >{{ issue.rawMessage }}</pre>
                </details>
              </li>
            </ol>
          </section>
        </template>
      </section>
    </div>

    <aside
      class="mx-auto mt-6 max-w-5xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <p class="font-semibold text-slate-900 dark:text-white">
        Alcance de la revisión
      </p>
      <p class="mt-1">
        Se comprueba la estructura XML contra CFDI 4.0 y los XSD referenciados
        para sus complementos. No se revisan la vigencia del CFDI, el estado de
        cancelación, la validez criptográfica de los sellos ni las reglas de
        negocio del SAT. Esta herramienta no está operada ni avalada por el SAT.
      </p>
    </aside>
  </section>
</template>
