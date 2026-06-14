import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'], // Include both CSS and JS as separate entries
            refresh: true,
        }),
        tailwindcss(),
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            deleteOriginFile: false,
        }),
        viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            deleteOriginFile: false,
        }),
    ],
    server: {
        hmr: {
            host: 'localhost',
        },
        // Avoid ENOSPC when fs.inotify.max_user_watches is low (common on Linux with large trees)
        watch: {
            usePolling: true,
            interval: 1000,
        },
    },
    optimizeDeps: {
        include: ['animejs'],
        // Force pre-bundling of critical dependencies to avoid TDZ issues
        force: true,
        esbuildOptions: {
            // Don't minify during pre-bundling to avoid TDZ issues
            minify: false,
        },
    },
    build: {
        // Clear cache before build to ensure fresh builds
        emptyOutDir: true,
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            // Preserve entry signatures to maintain proper module boundaries
            preserveEntrySignatures: 'strict',
            output: {
                // Use ES module format
                format: 'es',
                // Better chunk naming for production
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                // Split large vendors for parallel cache/load (entry still loads first)
                manualChunks(id) {
                    if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                        return 'react-vendor';
                    }
                    if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs')) {
                        return 'chart-vendor';
                    }
                    if (id.includes('node_modules/lucide-react')) {
                        return 'icons-vendor';
                    }
                    if (id.includes('node_modules/@tanstack')) {
                        return 'query-vendor';
                    }
                    if (id.includes('node_modules/date-fns')) {
                        return 'datefns-vendor';
                    }
                    if (id.includes('node_modules/@radix-ui')) {
                        return 'radix-vendor';
                    }
                    return undefined;
                },
            },
        },
        chunkSizeWarningLimit: 500,
        // Disable sourcemaps for production
        sourcemap: false,
        // Use esbuild with minimal settings - only compress whitespace
        minify: 'esbuild',
        // Target modern browsers
        target: 'es2020',
        esbuild: {
            legalComments: 'none',
            minifyIdentifiers: true,
            minifySyntax: true,
            minifyWhitespace: true,
            treeShaking: true,
        },
        // CSS handling - ensure CSS is properly extracted and linked
        cssCodeSplit: true, // Enable CSS code splitting - it works better with Laravel Vite plugin
        cssMinify: true,
    },
});
