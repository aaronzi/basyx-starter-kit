<template>
  <v-layout>
    <AppBar />

    <v-main :min-height="$vuetify.display.mdAndUp ? 800 : 550">
      <NuxtPage />
    </v-main>

    <AppFooter />
  </v-layout>
</template>
