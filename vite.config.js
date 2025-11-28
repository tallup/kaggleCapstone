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
        // Disable sourcemaps for production
        sourcemap: false,
        // Use terser with very conservative settings to avoid TDZ issues
        minify: 'terser',
        terserOptions: {
            compress: {
                // Disable all optimizations that could cause TDZ issues
                passes: 1,
                hoist_funs: false,
                hoist_vars: false,
                inline: false,
                collapse_vars: false,
                reduce_vars: false,
                reduce_funcs: false,
                // Keep function names for debugging
                keep_fnames: true,
                // Don't optimize code that might cause issues
                pure_funcs: [],
                unsafe: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false,
                unsafe_regexp: false,
                unsafe_undefined: false,
            },
            mangle: {
                // Don't mangle at all to avoid variable name conflicts
                reserved: [],
                keep_classnames: true,
                keep_fnames: true,
            },
            format: {
                comments: false,
                // Preserve as much as possible
                preserve_annotations: false,
            },
        },
        // Target modern browsers to avoid some transformation issues
        target: 'es2020',
    },
});
