import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export function useCanonicalUrl(path: MaybeRefOrGetter<string>) {
  const { public: publicConfig } = useRuntimeConfig()

  useHead(
    computed(() => ({
      link: [
        {
          rel: 'canonical',
          href: new URL(toValue(path), publicConfig.siteUrl).toString(),
        },
      ],
    })),
  )
}
