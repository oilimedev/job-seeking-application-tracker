// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/content", "@nuxtjs/color-mode"],
  colorMode: {
    preference: "system",
    fallback: "dark",
    classSuffix: "",
  },
  devtools: { enabled: true },
  compatibilityDate: "2024-04-03",
  css: ["~/assets/scss/main.scss"],

  $production: {
    routeRules: {
      "/**": { isr: true },
    },
  },
  $development: {
    //
  },
  $env: {
    staging: {
      //
    },
  },

  runtimeConfig: {
    // The private keys which are only available server-side
    apiSecret: "123",
    // Keys within public are also exposed client-side
    public: {
      apiBase: "/api",
    },
  },
});
