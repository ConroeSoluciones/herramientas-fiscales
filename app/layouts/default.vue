<template>
  <div
    class="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
  >
    <a
      href="#contenido-principal"
      class="focus:outline-brand-700 dark:focus:outline-brand-300 sr-only z-50 rounded bg-white p-3 text-slate-950 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:outline focus:outline-2 dark:bg-slate-900 dark:text-white"
    >
      Saltar al contenido
    </a>
    <AppHeader />
    <main
      id="contenido-principal"
      class="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
    >
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
