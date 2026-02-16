import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    return {
        base: command === 'build' ? '/sofik-game-funny/' : '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
        },
        server: {
            host: true,
            port: 3000,
        },
    };
});

