<?php

namespace Tests\Unit;

use App\Models\Facility;
use App\Services\FacilitySqlExportService;
use App\Services\FacilitySqlImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilitySqlBackupTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_rejects_facility_id_mismatch_with_header(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'hl360fb');
        $this->assertNotFalse($tmp);
        file_put_contents($tmp, "-- HL360_FACILITY_BACKUP facility_id=99\n");

        $result = app(FacilitySqlImportService::class)->importFromFile($tmp, 1);

        @unlink($tmp);

        $this->assertFalse($result['ok']);
        $this->assertArrayHasKey('detail', $result);
        $this->assertStringContainsString('99', $result['detail']);
        $this->assertStringContainsString('facility_id=1', $result['detail']);
    }

    public function test_import_rejects_missing_hl360_header(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'hl360fb');
        file_put_contents($tmp, "-- not a facility backup\n");

        $result = app(FacilitySqlImportService::class)->importFromFile($tmp, 1);

        @unlink($tmp);

        $this->assertFalse($result['ok']);
        $this->assertArrayHasKey('detail', $result);
        $this->assertStringContainsString('HL360_FACILITY_BACKUP', $result['detail']);
    }

    public function test_export_writes_header_line_with_facility_id(): void
    {
        $facility = Facility::factory()->create();

        $result = app(FacilitySqlExportService::class)->export((int) $facility->id, false);

        $this->assertTrue($result['success'] ?? false, $result['message'] ?? 'export failed');
        $this->assertArrayHasKey('path', $result);

        $path = $result['path'];
        $this->assertFileExists($path);

        $fh = fopen($path, 'rb');
        $this->assertNotFalse($fh);
        $firstLine = fgets($fh);
        fclose($fh);
        @unlink($path);

        $this->assertIsString($firstLine);
        $this->assertMatchesRegularExpression(
            '/^--\s*HL360_FACILITY_BACKUP\s+facility_id='.(int) $facility->id.'/i',
            trim((string) $firstLine)
        );
    }
}
