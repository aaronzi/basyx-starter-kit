// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';

export default defineNuxtPlugin(app => {
  const vuetify = createVuetify({
    ssr: true,
    components: {},
    display: {
      // Keep get-started in mobile mode for 1450px and below.
      thresholds: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1451,
        xl: 1920,
        xxl: 2560,
      },
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#009ee2',
            title: '#009ee2',
            header: '#303030',
            subheader: '#707070',
            normalText: '#303030',
            buttonText: '#FFFFFF',
            card: '#F6F6F6',
            cardHeader: '#F2F2F2',
            tableOdd: '#E1E1E1',
            tableEven: '#F5F5F5',
            background: '#FFFFFF',
            alertCard: '#F9F9F9',
            appBar: '#FFFFFF',
            footer: '#F2F2F2',
            footerText: '#303030',
            gradientStart: '#00FFC8',
            gradientEnd: '#347921',
            bronze: '#CD7F32',
            silver: '#ffffff',
            gold: '#ffbf00',
            cardInverse: '#212121',
            dataspaceFooter: '#FAFAFA',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#009ee2',
            title: '#FFFFFF',
            header: '#E1E1E1',
            subheader: '#9B9B9B',
            normalText: '#E1E1E1',
            buttonText: '#212121',
            card: '#212121',
            cardHeader: '#272727',
            tableOdd: '#272727',
            tableEven: '#212121',
            background: '#1A1A1A',
            alertCard: '#242424',
            appBar: '#1A1A1A',
            footer: '#212121',
            footerText: '#E1E1E1',
            gradientStart: '#00FFC8',
            gradientEnd: '#DDFF00',
            bronze: '#CD7F32',
            silver: '#ffffff',
            gold: '#FFD700',
            cardInverse: '#F6F6F6',
            dataspaceFooter: '#161616',
          },
        },
      },
    },
  });
  app.vueApp.use(vuetify);
});
