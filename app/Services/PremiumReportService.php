<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Spatie\Browsershot\Browsershot;

class PremiumReportService
{
    /**
     * Generate a professional PDF from a Blade view using Browsershot when available, or DomPDF.
     *
     * @param  array<string, mixed>  $options  orientation, format, margins, etc.
     */
    public function generate(string $view, array $data = [], ?string $filename = null, array $options = []): string
    {
        Log::debug('Starting professional PDF generation', ['view' => $view, 'filename' => $filename]);

        $driver = config('reports.pdf_driver', 'auto');

        if ($driver === 'dompdf') {
            return $this->generateWithDompdf($view, $data, $options);
        }

        if ($driver === 'browsershot') {
            return $this->generateWithBrowsershotOrDompdf($view, $data, $options);
        }

        if ($this->resolveChromePath() === null) {
            Log::info('PremiumReportService: No Chrome/Chromium binary found; using DomPDF', ['view' => $view]);

            return $this->generateWithDompdf($view, $data, $options);
        }

        return $this->generateWithBrowsershotOrDompdf($view, $data, $options);
    }

    /**
     * @param  array<string, mixed>  $options
     */
    private function generateWithBrowsershotOrDompdf(string $view, array $data, array $options): string
    {
        $html = View::make($view, $data)->render();

        $browsershot = Browsershot::html($html)
            ->format($options['format'] ?? 'A4')
            ->margins(
                $options['margin_top'] ?? 10,
                $options['margin_right'] ?? 10,
                $options['margin_bottom'] ?? 10,
                $options['margin_left'] ?? 10
            )
            ->showBackground();

        if (($options['orientation'] ?? 'portrait') === 'landscape') {
            $browsershot->landscape();
        }

        $chromePath = $this->resolveChromePath();
        if ($chromePath !== null) {
            $browsershot->setChromePath($chromePath);
            Log::debug('PremiumReportService: Using Chrome at '.$chromePath);
        }

        foreach ($this->candidateNodePaths() as $path) {
            if ($path && file_exists($path)) {
                $browsershot->setNodeBinary($path);
                Log::debug('PremiumReportService: Using Node at '.$path);
                break;
            }
        }

        $browsershot->timeout(180)
            ->noSandbox()
            ->addChromiumArguments([
                'disable-setuid-sandbox',
                'disable-dev-shm-usage',
                'disable-gpu',
                'disable-extensions',
                'font-render-hinting=none',
                'disable-web-security',
                'no-sandbox',
                'single-process',
            ]);

        try {
            Log::debug('PremiumReportService: Attempting browsershot->pdf()');
            $pdf = $browsershot->pdf();
            Log::debug('PremiumReportService: PDF generated successfully');

            return $pdf;
        } catch (\Throwable $e) {
            Log::warning('Browsershot PDF failed; falling back to DomPDF', [
                'error' => $e->getMessage(),
                'view' => $view,
            ]);

            return $this->generateWithDompdf($view, $data, $options);
        }
    }

    private function resolveChromePath(): ?string
    {
        $candidates = array_unique(array_filter([
            env('CHROME_PATH'),
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
        ]));

        foreach ($candidates as $path) {
            if ($path && @is_executable($path)) {
                return $path;
            }
        }

        foreach ($candidates as $path) {
            if ($path && file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * @return list<string|null>
     */
    private function candidateNodePaths(): array
    {
        return [
            env('NODE_PATH'),
            '/usr/bin/node',
            '/usr/local/bin/node',
            '/home/forge/.nvm/versions/node/v20.11.0/bin/node',
        ];
    }

    /**
     * DomPDF does not require Chrome/Node (works on typical PHP hosting).
     *
     * @param  array<string, mixed>  $options
     */
    private function generateWithDompdf(string $view, array $data, array $options): string
    {
        $orientation = ($options['orientation'] ?? 'portrait') === 'landscape' ? 'landscape' : 'portrait';

        return Pdf::loadView($view, $data)
            ->setPaper('a4', $orientation)
            ->output();
    }
}
