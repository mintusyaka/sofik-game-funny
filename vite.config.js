import { defineConfig } from 'vite';

export default defineConfig({
    base: '/sofik-game-funny/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        host: true,
        port: 3000,
    },
});
