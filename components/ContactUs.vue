<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card border class="d-flex flex-column h-100">
        <template #text>
          <div class="text-h6 d-flex align-center text-success">
            Get Commercial Support
            <v-chip
              class="text-none ms-3"
              size="x-small"
              variant="outlined"
              prepend-icon="mdi-face-agent"
            >
              <span class="text-medium-emphasis">Help</span>
            </v-chip>
          </div>

          <div class="mt-4">
            <p class="text-caption text-medium-emphasis mb-2">
              Need help with your own project using Ecipse BaSyx and the Asset Administration Shell?
            </p>

            <strong class="text-body-2 d-inline-block">
              Our team of experts is here to help you advance your project to the next level!
            </strong>
          </div>
        </template>
        <template #actions>
          <v-spacer />
          <v-btn
            class="text-none ms-2 text-buttonText ma-2"
            color="success"
            rounded="lg"
            text="Contact us!"
            variant="flat"
            :href="mailtoSupport"
          />
        </template>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card border class="d-flex flex-column h-100">
        <template #text>
          <div class="text-h6 d-flex align-center text-primary">
            Research Collaboration
            <v-chip
              class="text-none ms-3"
              size="x-small"
              variant="outlined"
              prepend-icon="mdi-school"
            >
              <span class="text-medium-emphasis">Open</span>
            </v-chip>
          </div>

          <div class="mt-4">
            <p class="text-caption text-medium-emphasis mb-2">
              Exploring AAS, Digital Twins, or Dataspaces?
            </p>

            <strong class="text-body-2 d-inline-block">
              Our researchers can enhance your project with cutting-edge insights and hands-on
              expertise. Let's partner to make your research a success!
            </strong>
          </div>
        </template>
        <template #actions>
          <v-spacer />
          <v-btn
            class="text-none ms-2 text-buttonText ma-2"
            color="primary"
            rounded="lg"
            text="Connect with us!"
            variant="flat"
            :href="mailtoResearch"
          />
        </template>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const mailtoSupport = ref(
  `mailto:anfrage@iese.fraunhofer.de,frank.schnicke@iese.fraunhofer.de` +
    `?subject=Commercial Support Request` +
    `&body=Hello,%0D%0A%0D%0A` +
    `We are reaching out to inquire about commercial support for <Eclipse BaSyx / the Asset Administration Shell>. ` +
    `We'd love to learn more about your offerings.%0D%0A%0D%0A` +
    `Name: <Insert Your Name>%0D%0A` +
    `Role: <Insert Your Role>%0D%0A` +
    `Company: <Insert Company Name>%0D%0A` +
    `Contact: <Insert Your Contact Info>%0D%0A%0D%0A` +
    `<Please add any additional details or specific requests here>%0D%0A%0D%0A` +
    `Best regards,%0D%0A` +
    `<Your Name>`
);

const mailtoResearch = ref(
  `mailto:anfrage@iese.fraunhofer.de,frank.schnicke@iese.fraunhofer.de` +
    `?subject=Research Collaboration Inquiry` +
    `&body=Hello,%0D%0A%0D%0A` +
    `We are reaching out to explore potential research collaboration involving <Digital Twins/AAS/Dataspaces>. We'd love to discuss how we can work together.%0D%0A%0D%0A` +
    `Research Area/Interest: <Insert your focus>%0D%0A` +
    `Contact Info: <Insert your contact details>%0D%0A%0D%0A` +
    `Looking forward to hearing from you on how we can proceed!%0D%0A%0D%0A` +
    `Best regards,%0D%0A<Your Name>`
);
</script>
