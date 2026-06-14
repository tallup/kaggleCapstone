<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>{{ config('app.name', 'HomeLogic360') }}</title>
        @php
            $appBuildId = '';
            if (! file_exists(public_path('hot')) && file_exists(public_path('build/manifest.json'))) {
                $appBuildId = (string) filemtime(public_path('build/manifest.json'));
            }
        @endphp
        @if ($appBuildId !== '')
            <script>window.__APP_BUILD_ID__ = @json($appBuildId);</script>
        @endif

        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
        
        {{-- PWA Manifest --}}
        <link rel="manifest" href="{{ asset('manifest.json') }}">
        <meta name="theme-color" content="#E0F2FE">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="HL360">
        
        {{-- Favicon and App Icons --}}
        <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('images/logonew.png') }}">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('images/logonew.png') }}">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('images/logonew.png') }}">
        <link rel="icon" type="image/png" sizes="192x192" href="{{ asset('images/logonew.png') }}">
        <link rel="icon" type="image/png" sizes="512x512" href="{{ asset('images/logonew.png') }}">
        <link rel="shortcut icon" href="{{ asset('images/logonew.png') }}">
        
        {{-- Suppress Cloudflare cookie warnings IMMEDIATELY - before any other scripts --}}
        @env('production')
            <script>
                (function() {
                    // Capture console methods before anything else
                    const originalWarn = console.warn;
                    const originalError = console.error;
                    const originalLog = console.log;
                    
                    // Helper function to check if message should be suppressed
                    function shouldSuppress(message) {
                        const lowerMessage = message.toLowerCase();
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
                    
                    // Override console.warn
                    console.warn = function() {
                        const message = Array.from(arguments).join(' ');
                        if (shouldSuppress(message)) {
                            return; // Suppress Cloudflare cookie warnings
                        }
                        originalWarn.apply(console, arguments);
                    };
                    
                    // Override console.error
                    console.error = function() {
                        const message = Array.from(arguments).join(' ');
                        if (shouldSuppress(message)) {
                            return; // Suppress Cloudflare cookie errors
                        }
                        originalError.apply(console, arguments);
                    };
                    
                    // Also override console.log in case errors are logged there
                    console.log = function() {
                        const message = Array.from(arguments).join(' ');
                        if (shouldSuppress(message)) {
                            return; // Suppress Cloudflare cookie logs
                        }
                        originalLog.apply(console, arguments);
                    };
                })();
            </script>
        @endenv
        
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body style="margin: 0; padding: 0;">
        <noscript>
            <div style="padding: 20px; text-align: center; background: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div>
                    <h1 style="color: red;">JavaScript is Required</h1>
                    <p>Please enable JavaScript in your browser to use this application.</p>
                </div>
            </div>
        </noscript>
        <div id="react-app"></div>
        <script>
            // Debug logging
            console.log('Page loaded, React app should initialize...');
            window.addEventListener('DOMContentLoaded', function() {
                console.log('DOM Content Loaded');
                const rootElement = document.getElementById('react-app');
                console.log('React root element found:', !!rootElement);
                if (rootElement) {
                    console.log('Root element:', rootElement);
                } else {
                    console.error('ERROR: React root element not found!');
                }
            });
            
            // Check for errors
            window.addEventListener('error', function(event) {
                console.error('Global error:', event.error);
                const rootElement = document.getElementById('react-app');
                if (rootElement && event.error) {
                    rootElement.innerHTML = `
                        <div style="padding: 40px; text-align: center; background: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                            <h1 style="color: red; margin-bottom: 20px;">JavaScript Error</h1>
                            <p style="color: #666; margin-bottom: 10px;">${event.error.message}</p>
                            <pre style="background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: left; overflow: auto; max-width: 800px; margin: 20px 0;">${event.error.stack || 'No stack trace available'}</pre>
                            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                                Reload Page
                            </button>
                        </div>
                    `;
                }
            });
        </script>
    </body>
</html>

