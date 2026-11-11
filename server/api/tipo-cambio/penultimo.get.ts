import { getSidofTipoCambioRepository } from '../../utils/sidof-tipo-cambio-repository.js'

export default defineEventHandler(async () => {
  try {
    const record =
      await getSidofTipoCambioRepository().findPenultimateByPublicationDate()
    if (!record) return null

    return {
      codNota: record.codNota,
      publicationDate: record.publicationDate,
      pesosPerDollar: record.pesosPerDollar,
    }
  } catch (error) {
    console.error(
      'No se pudo consultar el tipo de cambio penúltimo en MySQL.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'El tipo de cambio no está disponible por el momento.',
    })
  }
})
