import tailwindcss from '@tailwindcss/vite'

const siteUrl =
  process.env.NUXT_PUBLIC_SITE_URL || 'https://www.csfacturacion.com'
const siteName = process.env.NUXT_PUBLIC_SITE_NAME?.trim() || 'CSFacturación'
const marketingUrl = process.env.NUXT_PUBLIC_MARKETING_URL?.trim() || siteUrl

export default defineNuxtConfig({
  compatibilityDate: '2026-11-18',

  devtools: { enabled: true },

  modules: [
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@nuxtjs/robots',
    '@nuxt/eslint',
  ],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storage: 'localStorage',
    storageKey: 'cs-herramientas-color-mode',
  },

  site: {
    name: siteName,
    url: siteUrl,
    defaultLocale: 'es-MX',
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/aviso-legal', '/privacidad', '/errores', '/errores/**'],
  },

  runtimeConfig: {
    public: { siteName, siteUrl, marketingUrl },
  },

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    experimental: {
      tasks: true,
    },
    // Las claves deben coincidir literalmente con `triggers.crons` de wrangler.jsonc.
    scheduledTasks: {
      '20 14 * * *': ['sidof-sync'],
      '30 15 1 * *': ['sat-catalogos-sync'],
    },
  },

  app: {
    head: {
      title: siteName,
      titleTemplate: `%s | ${siteName}`,
      htmlAttrs: { lang: 'es-MX' },
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap',
        },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light dark' },
        { name: 'theme-color', content: '#00A5D5' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    transpile: ['@vuepic/vue-datepicker'],
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  routeRules: {
    '/errores': {
      redirect: { to: '/codigos-sat', statusCode: 301 },
    },
    '/errores/': {
      redirect: { to: '/codigos-sat', statusCode: 301 },
    },
    '/errores/**': {
      redirect: { to: '/codigos-sat/**', statusCode: 301 },
    },
    // Activar prerenderizado por ruta cuando se defina la estrategia de publicación.
    // '/': { prerender: true },
    // '/tipo-de-cambio-dolar-mxn': { prerender: true },
  },
})
