import { getSidofTipoCambioRepository } from '../../utils/sidof-tipo-cambio-repository.js'

export default defineEventHandler(async (event) => {
  const month = getQuery(event).mes
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El mes debe tener el formato AAAA-MM.',
    })
  }

  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate()
  const startDate = `${month}-01`
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  try {
    const records = await getSidofTipoCambioRepository(
      event,
    ).findByRateDateRange(startDate, endDate)

    return records.map((record) => ({
      codNota: record.codNota,
      publicationDate: record.publicationDate,
      rateDate: record.rateDate,
      pesosPerDollar: record.pesosPerDollar,
      title: record.title,
      sourceUrl: record.sourceUrl,
    }))
  } catch (error) {
    console.error(
      'No se pudo consultar el historial del tipo de cambio en D1.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage:
        'El historial del tipo de cambio no está disponible por el momento.',
    })
  }
})
