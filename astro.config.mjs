import { defineConfig } from 'astro/config';

// SITE_URL / BASE_PATH are set automatically by the deploy workflow:
// on bsanderson410.github.io the base is /snowai; once a custom domain is attached it becomes /.
export default defineConfig({
  site: process.env.SITE_URL || 'https://snowai.com',
  base: process.env.BASE_PATH || '/',
});
