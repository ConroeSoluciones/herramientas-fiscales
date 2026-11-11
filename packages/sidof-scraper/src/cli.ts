import { SidofTipoCambioSource } from './scraper/sidof-tipo-cambio.js'

try {
  const items = await new SidofTipoCambioSource().scrape()
  console.info(`SIDOF: ${items.length} elemento(s) extraído(s)`)
  console.info(JSON.stringify(items, null, 2))
} catch (error) {
  console.error('Falló el scraper de tipo de cambio de SIDOF:', error)
  process.exitCode = 1
}
