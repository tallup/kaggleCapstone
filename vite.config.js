import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        hmr: {
            host: 'localhost',
        },
    },
    optimizeDeps: {
        include: ['animejs'],
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                // Let Vite handle chunking automatically to avoid TDZ issues
                // manualChunks: undefined,
                manualChunks: (id) => {
                    // Only split very large libraries to avoid circular dependency issues
                    if (id.includes('node_modules')) {
                        // React and React DOM must be together to avoid TDZ issues
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'vendor-react';
                        }
                        // Keep everything else in one vendor chunk to avoid circular deps
                        return 'vendor';
                    }
                },
            },
        },
        // Warn if chunk exceeds 500KB
        chunkSizeWarningLimit: 500,
        // Enable sourcemaps for debugging (helps identify TDZ issues)
        sourcemap: true,
        // Use esbuild with conservative minification to avoid TDZ issues
        minify: 'esbuild',
        // Target modern browsers to avoid some transformation issues
        target: 'es2020',
    },
});
