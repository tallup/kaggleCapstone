import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './Root.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { reconcileAppBuildId } from './utils/buildId';
import { ToastProvider } from './contexts/ToastContext';
import ThemeWrapper from './components/ThemeWrapper';
// Import CSS - Vite will handle it properly
import '../css/app.css';
// Register service worker for PWA
import { registerServiceWorker } from './services/serviceWorker';

// Suppress Cloudflare cookie warnings - after imports
// This prevents these harmless errors from cluttering the console
(function () {
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;

    // Helper function to check if message should be suppressed
    function shouldSuppress(message) {
        const lowerMessage = message.toString().toLowerCase();
        return (
            lowerMessage.includes('cookie') && (
                lowerMessage.includes('_cf_bm') ||
                lowerMessage.includes('__cf_bm') ||
                lowerMessage.includes('cf_clearance') ||
                lowerMessage.includes('cf_bm') ||
                lowerMessage.includes('rejected for invalid domain') ||
                lowerMessage.includes('has been rejected')
            )
        ) || (
                lowerMessage.includes('__cf_bm') ||
                lowerMessage.includes('_cf_bm')
            );
    }

    console.warn = function (...args) {
        const message = args.join(' ');
        if (shouldSuppress(message)) {
            return; // Suppress Cloudflare cookie warnings
        }
        originalWarn.apply(console, args);
    };

    console.error = function (...args) {
        const message = args.join(' ');
        if (shouldSuppress(message)) {
            return; // Suppress Cloudflare cookie errors
        }
        originalError.apply(console, args);
    };

    // Also override console.log in case errors are logged there
    console.log = function (...args) {
        const message = args.join(' ');
        if (shouldSuppress(message)) {
            return; // Suppress Cloudflare cookie logs
        }
        originalLog.apply(console, args);
    };
})();



// Create QueryClient in a function to ensure it's initialized after all imports
function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 2 * 60 * 1000, // 2 minutes - prevents redundant refetches across page navigations
            },
        },
    });
}

const queryClient = createQueryClient();

// Wait for DOM to be ready
function initApp() {
    if (reconcileAppBuildId()) {
        return;
    }

    const rootElement = document.getElementById('react-app');
    if (!rootElement) {
        console.error('React app root element (#react-app) not found');
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif; background: white;">
                <h1 style="color: red;">Error: React root element not found</h1>
                <p>Looking for element with id="react-app"</p>
                <p style="margin-top: 20px; color: #666;">Please check the browser console for more details.</p>
            </div>
        `;
        return;
    }

    console.log('React app root element found, initializing...');

    // First, render a simple test to verify React is working
    try {
        const root = ReactDOM.createRoot(rootElement);

        // Clear any existing content
        rootElement.innerHTML = '';

        // Render the full app directly
        try {
            root.render(
                <React.StrictMode>
                    <ErrorBoundary>
                        <QueryClientProvider client={queryClient}>
                            <ThemeWrapper>
                                <ToastProvider>
                                    <BrowserRouter>
                                        <App />
                                    </BrowserRouter>
                                </ToastProvider>
                            </ThemeWrapper>
                        </QueryClientProvider>
                    </ErrorBoundary>
                </React.StrictMode>
            );
            console.log('React app rendered successfully');
        } catch (renderError) {
            console.error('Error rendering full app:', renderError);
            root.render(
                React.createElement('div', {
                    style: { padding: '40px', textAlign: 'center', background: 'white', minHeight: '100vh' }
                },
                    React.createElement('h1', { style: { color: 'red' } }, 'Error Loading Full App'),
                    React.createElement('p', { style: { color: '#666' } }, renderError.message),
                    React.createElement('button', {
                        onClick: () => window.location.reload(),
                        style: { padding: '10px 20px', marginTop: '20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }
                    }, 'Reload Page')
                )
            );
        }
    } catch (error) {
        console.error('Error rendering React app:', error);
        rootElement.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif; background: white;">
                <h1 style="color: red; margin-bottom: 20px;">Error Loading Application</h1>
                <p style="color: #666; margin-bottom: 10px;">${error.message}</p>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: left; overflow: auto; max-width: 800px; margin: 0 auto;">${error.stack}</pre>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Initialize immediately - don't wait for DOMContentLoaded
// This ensures React initializes as soon as the script loads
console.log('app.jsx file loaded, readyState:', document.readyState);

// Register service worker for PWA and initialize Echo
if (typeof window !== 'undefined') {
    // Register after a short delay to not block app initialization
    setTimeout(() => {
        registerServiceWorker().catch((error) => {
            console.warn('Service worker registration failed:', error);
        });
        
        // Initialize background sync
        import('./services/backgroundSync').then(({ registerBackgroundSync, setupOnlineSync }) => {
            registerBackgroundSync().catch((error) => {
                console.warn('Background sync registration failed:', error);
            });
            setupOnlineSync();
        });

        // Initialize Echo only when user is logged in (avoids WebSocket errors on public pages like /contact)
        if (localStorage.getItem('auth_token')) {
            import('./services/echo').then(({ initializeEcho }) => {
                initializeEcho();
            });
        }
    }, 1000);
}

// Try to initialize immediately
try {
    initApp();
} catch (error) {
    console.error('Error during immediate init:', error);
    // If immediate init fails, wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        // Try again after a short delay
        setTimeout(initApp, 100);
    }
}

