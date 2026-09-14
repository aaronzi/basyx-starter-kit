<template>
  <v-footer :height="40" app style="z-index: 1004" color="footer">
    <div style="position: absolute; left: 16px; display: flex; align-items: center">
      <!-- BaSyx Old Website -->
      <a
        href="https://eclipse.dev/basyx/"
        target="_blank"
        title="BaSyx Website"
        class="mr-2"
        style="width: 24px; height: 24px"
      >
        <img src="@/assets/Icon_BaSyx.svg" width="24" height="24" alt="BaSyx Icon" />
      </a>

      <!-- Footer Links -->
      <v-btn
        icon="mdi-email"
        size="x-small"
        variant="plain"
        href="mailto:basyx-dev@eclipse.org"
        aria-label="Send email to the BaSyx developers"
      />
      <v-btn
        icon="mdi-github"
        size="x-small"
        variant="plain"
        href="https://github.com/eclipse-basyx"
        target="_blank"
        aria-label="Open BaSyx GitHub page"
      />
      <v-btn
        icon="mdi-docker"
        size="x-small"
        variant="plain"
        href="https://hub.docker.com/u/eclipsebasyx"
        target="_blank"
        aria-label="Open BaSyx DockerHub page"
      />
      <v-btn
        icon="mdi-book-open-variant"
        size="x-small"
        variant="plain"
        href="https://wiki.basyx.org/"
        target="_blank"
        aria-label="Go to BaSyx documentation"
      />
      <v-btn
        icon="mdi-cookie"
        size="x-small"
        variant="plain"
        aria-label="Open cookie policy page"
        @click="cookieDialog = true"
      />
      <v-btn
        icon="mdi-card-account-details-outline"
        size="x-small"
        variant="plain"
        to="/impressum"
        aria-label="Open imprint page"
      />
      <v-btn
        icon="mdi-shield-account-outline"
        size="x-small"
        variant="plain"
        to="/datenschutz"
        aria-label="Open privacy policy page"
      />
    </div>

    <div
      v-if="mdAndUp"
      class="text-caption text-disabled text-footerText"
      style="position: absolute; left: 50%; transform: translateX(-50%)"
    >
      &copy; {{ new Date().getFullYear() }}
      <span class="d-none d-sm-inline-block">Eclipse BaSyx™</span>
      —
      <a
        class="text-decoration-none on-surface"
        href="https://opensource.org/licenses/mit-license.php"
        rel="noopener noreferrer"
        target="_blank"
      >
        MIT License
      </a>
      <span class="mx-1">·</span>
      <NuxtLink class="text-decoration-none on-surface" to="/impressum">Impressum</NuxtLink>
      <span class="mx-1">·</span>
      <NuxtLink class="text-decoration-none on-surface" to="/datenschutz">Datenschutz</NuxtLink>
    </div>

    <div v-if="mdAndUp" style="position: absolute; right: 16px; display: flex; align-items: center">
      <!-- IESE Logo -->
      <a
        href="https://www.iese.fraunhofer.de/"
        target="_blank"
        title="Fraunhofer IESE"
        style="display: flex; align-items: center"
        class="mr-6"
      >
        <img
          v-if="isDarkTheme"
          src="@/assets/Logo_IESE_Dark.svg"
          width="87.67"
          height="25"
          alt="Fraunhofer IESE Logo"
        />
        <img
          v-else
          src="@/assets/Logo_IESE_Light.svg"
          width="87.67"
          height="25"
          alt="HTW Berlin Logo"
        />
      </a>
      <!-- HTW Logo -->
      <a
        href="https://www.htw-berlin.de/"
        target="_blank"
        title="HTW Berlin"
        style="display: flex; align-items: center"
      >
        <img
          v-if="isDarkTheme"
          src="@/assets/Logo_HTW_Dark.svg"
          width="130"
          height="16.36"
          alt="HTW Berlin Logo"
        />
        <img
          v-else
          src="@/assets/Logo_HTW_Light.svg"
          width="130"
          height="16.36"
          alt="HTW Berlin Logo"
        />
      </a>
    </div>
  </v-footer>
  <!-- Cookie Dialog -->
  <v-dialog v-model="cookieDialog" width="640px" height="auto">
    <v-card>
      <v-card-title>
        <v-row align="center">
          <v-col>
            <span class="text-header">Cookie Policy</span>
          </v-col>
          <v-spacer />
          <v-col cols="auto">
            <v-btn icon="mdi-close" variant="plain" @click="cookieDialog = false" />
          </v-col>
        </v-row>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="text-normalText">
          We collect anonymous analytics data to improve our service.
        </div>
        <div class="text-normalText">You can always change or withdraw your consent later.</div>
        <v-divider class="mt-3 mb-2" />
        <v-row align="center" class="my-0">
          <v-col>
            <v-switch
              v-model="consent"
              hide-details
              class="mr-2"
              :label="
                'Cookies: ' + (indeterminate ? 'not set' : currentConsent ? 'accepted' : 'denied')
              "
              :indeterminate="indeterminate"
            />
          </v-col>
          <v-col>
            <v-btn variant="tonal" @click="updateConsent()">Update Consent</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useDisplay, useTheme } from 'vuetify';

defineOptions({
  name: 'AppFooter',
});

const theme = useTheme();
const { mdAndUp } = useDisplay();

const cookieDialog = ref(false);
const currentConsent = ref(false);
const consent = ref(true);
const indeterminate = ref(false);

const isDarkTheme = computed(() => theme.global.current.value.dark);

function getCookieStatus() {
  const consentCookie = useCookie('consent', { maxAge: 31536000 }); // 1 year
  if (consentCookie.value === 'granted') {
    consent.value = true;
    currentConsent.value = true;
    indeterminate.value = false;
  } else if (consentCookie.value === 'denied') {
    consent.value = false;
    currentConsent.value = false;
    indeterminate.value = false;
  } else {
    indeterminate.value = true;
  }
}

function updateConsent() {
  const { gtag } = useGtag();
  if (typeof gtag !== 'function') {
    return;
  }

  if (!consent.value) {
    gtag('consent', 'update', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    document.cookie = 'consent=denied; max-age=31536000'; // 1 year
    currentConsent.value = false;
  } else {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    document.cookie = 'consent=granted; max-age=31536000'; // 1 year
    currentConsent.value = true;
  }
}

onMounted(() => {
  getCookieStatus();
});

watch(cookieDialog, newValue => {
  if (newValue) {
    getCookieStatus();
  }
});
</script>

<style scoped lang="sass">
.social-link :deep(.v-icon)
  color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity))
  text-decoration: none
  transition: .2s ease-in-out

  &:hover
    color: rgba(25, 118, 210, 1)
</style>
