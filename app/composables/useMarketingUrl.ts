export function useMarketingUrl(placement: string) {
  const { public: publicConfig } = useRuntimeConfig()

  const url = new URL(
    publicConfig.marketingUrl || publicConfig.siteUrl,
    publicConfig.siteUrl,
  )

  url.searchParams.set('utm_source', 'csfacturacion_herramientas')
  url.searchParams.set('utm_medium', 'referral')
  url.searchParams.set('utm_campaign', 'portal_utilidades')
  url.searchParams.set('utm_content', placement)

  return url.toString()
}
