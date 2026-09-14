<template>
  <v-container class="legal-page py-10 px-6">
    <h1>Impressum</h1>

    <p>
      Aaron Zielstorff<br />
      Ottomar-Geschke Str. 25a<br />
      12555 Berlin
    </p>

    <h2>Kontakt</h2>
    <p>
      Telefon: +4916097506280<br />
      E-Mail:
      <a href="mailto:aaron.zielstorff@iese.fraunhofer.de">aaron.zielstorff@iese.fraunhofer.de</a>
    </p>

    <p>
      Quelle:
      <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer">eRecht24</a>
    </p>
  </v-container>
</template>

<script setup lang="ts">
useHead({
  title: 'Impressum | Eclipse BaSyx Starter-Kit',
  meta: [
    {
      name: 'description',
      content: 'Impressum des Eclipse BaSyx Starter-Kit.',
    },
  ],
});
</script>

<style scoped lang="sass">
.legal-page
  max-width: 900px

  h1
    margin-bottom: 1.5rem
    font-size: 2rem
    font-weight: 700

  h2
    margin-top: 2rem
    margin-bottom: .75rem
    font-size: 1.35rem
    font-weight: 700

  p
    margin-bottom: 1rem
    line-height: 1.7

  a
    color: rgb(var(--v-theme-primary))
    text-decoration: none

    &:hover
      text-decoration: underline
</style>
