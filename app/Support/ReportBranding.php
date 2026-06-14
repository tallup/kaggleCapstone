<?php

namespace App\Support;

use App\Models\Facility;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Shared facility colors and PDF image embedding for all generated reports (PDF, exports).
 */
class ReportBranding
{
    /**
     * Visual palette aligned with Facility::getBrandingAttribute() defaults.
     *
     * @return array<string, string>
     */
    public static function palette(?Facility $facility): array
    {
        $primaryColor = self::sanitizeHexColor($facility?->primary_color, '#1E3A5F');
        $secondaryColor = self::sanitizeHexColor($facility?->secondary_color, '#86EFAC');
        $accentColor = self::sanitizeHexColor($facility?->accent_color, '#FFFFFF');

        $headerTint = self::nearWhiteHex($secondaryColor)
            ? self::lightenHex($primaryColor, 0.94)
            : self::lightenHex($secondaryColor, 0.91);

        $tableHeaderBg = self::nearWhiteHex($secondaryColor)
            ? self::lightenHex($primaryColor, 0.92)
            : self::lightenHex($secondaryColor, 0.86);

        $infoHeaderBg = self::nearWhiteHex($secondaryColor)
            ? self::lightenHex($primaryColor, 0.93)
            : self::lightenHex($secondaryColor, 0.84);

        $legendBg = self::nearWhiteHex($secondaryColor)
            ? self::lightenHex($primaryColor, 0.96)
            : self::lightenHex($secondaryColor, 0.94);

        $brandBorder = self::lightenHex($primaryColor, 0.78);
        $gridBorder = self::lightenHex($primaryColor, 0.72);

        return [
            'primaryColor' => $primaryColor,
            'secondaryColor' => $secondaryColor,
            'accentColor' => $accentColor,
            'headerTint' => $headerTint,
            'tableHeaderBg' => $tableHeaderBg,
            'infoHeaderBg' => $infoHeaderBg,
            'legendBg' => $legendBg,
            'brandBorder' => $brandBorder,
            'gridBorder' => $gridBorder,
        ];
    }

    /**
     * Resolve a storage path or URL to a data URI for DomPDF.
     */
    public static function imageToDataUri(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }
        $raw = trim($raw);

        if (! filter_var($raw, FILTER_VALIDATE_URL)) {
            if (Storage::disk('public')->exists($raw)) {
                return self::filePathToDataUri(Storage::disk('public')->path($raw));
            }

            return null;
        }

        $path = parse_url($raw, PHP_URL_PATH) ?? '';
        if (str_contains($path, '/storage/')) {
            $relative = ltrim(substr($path, strpos($path, '/storage/') + strlen('/storage/')), '/');
            if ($relative !== '' && Storage::disk('public')->exists($relative)) {
                return self::filePathToDataUri(Storage::disk('public')->path($relative));
            }
        }

        try {
            $response = Http::timeout(8)->get($raw);
            if (! $response->successful()) {
                return null;
            }
            $mime = $response->header('Content-Type') ?? 'image/jpeg';
            if (! str_starts_with($mime, 'image/')) {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode($response->body());
        } catch (\Throwable) {
            return null;
        }
    }

    private static function filePathToDataUri(string $absolutePath): ?string
    {
        if (! is_readable($absolutePath)) {
            return null;
        }
        $mime = @mime_content_type($absolutePath) ?: 'image/png';
        if (! str_starts_with($mime, 'image/')) {
            return null;
        }
        $data = @file_get_contents($absolutePath);
        if ($data === false) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($data);
    }

    public static function sanitizeHexColor(?string $color, string $fallback): string
    {
        $c = is_string($color) ? trim($color) : '';
        if (preg_match('/^#[0-9A-Fa-f]{6}$/', $c)) {
            return $c;
        }

        return $fallback;
    }

    public static function lightenHex(string $hex, float $towardWhite): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) !== 6) {
            return '#f4f7fb';
        }
        $towardWhite = max(0.0, min(1.0, $towardWhite));
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        $r = (int) round($r + (255 - $r) * $towardWhite);
        $g = (int) round($g + (255 - $g) * $towardWhite);
        $b = (int) round($b + (255 - $b) * $towardWhite);

        return sprintf('#%02x%02x%02x', $r, $g, $b);
    }

    public static function nearWhiteHex(string $hex): bool
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) !== 6) {
            return true;
        }
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return $r >= 245 && $g >= 245 && $b >= 245;
    }
}
