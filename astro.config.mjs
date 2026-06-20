import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://chaiklang.buildwithoracle.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  server: { watch: { ignored: ['**/ψ/**'] } },
});
