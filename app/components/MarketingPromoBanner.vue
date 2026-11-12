<script setup lang="ts">
const marketingUrl = useMarketingUrl('banner_conoce_csfacturacion')
</script>

<template>
  <section
    aria-labelledby="marketing-promo-titulo"
    data-marketing-slot="portal-promo"
    class="border-brand-200 dark:border-brand-900 mx-auto mt-12 grid max-w-5xl gap-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-center dark:bg-slate-900"
  >
    <div>
      <p
        class="text-brand-800 dark:text-brand-300 text-xs font-semibold tracking-[0.16em] uppercase"
      >
        Más de CSFacturación
      </p>
      <h2
        id="marketing-promo-titulo"
        class="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl dark:text-white"
      >
        Haz más sencilla tu operación de facturación
      </h2>
      <p
        class="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300"
      >
        Conoce más soluciones de CSFacturación para acompañar las necesidades de
        tu negocio.
      </p>
      <a
        :href="marketingUrl"
        class="bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus-visible:outline-brand-300 mt-5 flex min-h-11 w-full items-center justify-center gap-3 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-fit"
      >
        Conocer CSFacturación
        <svg
          aria-hidden="true"
          class="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M7 17 17 7M8 7h9v9"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </a>
    </div>

    <aside
      aria-label="Espacio reservado para campaña de Marketing"
      data-marketing-slot="campaign-promo"
      class="border-brand-300 dark:border-brand-800 flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50 px-5 py-6 text-center dark:bg-slate-950"
    >
      <p
        class="text-brand-800 dark:text-brand-300 text-xs font-bold tracking-[0.18em]"
      >
        ESPACIO PARA CAMPAÑA
      </p>
      <p
        class="mt-2 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300"
      >
        Creatividad, mensaje y destino por definir con el equipo de Marketing.
      </p>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Ubicación: banner de herramientas
      </p>
    </aside>
  </section>
</template>
