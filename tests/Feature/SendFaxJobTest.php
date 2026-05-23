<?php

namespace Tests\Feature;

use App\Jobs\SendFaxJob;
use App\Models\Facility;
use App\Models\Fax;
use App\Models\FaxNumber;
use App\Models\FaxSetting;
use App\Services\Fax\Contracts\FaxProvider;
use App\Services\Fax\FaxManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SendFaxJobTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('alreadySentFaxStates')]
    public function test_retry_does_not_send_again_when_fax_already_has_provider_id_or_terminal_status(
        string $status,
        ?string $providerFaxId
    ): void {
        Storage::fake('local');
        config(['fax.disk' => 'local']);
        Storage::disk('local')->put('faxes/test.pdf', '%PDF-1.4');

        $facility = Facility::factory()->create();
        $fromNumber = FaxNumber::create([
            'facility_id' => $facility->id,
            'provider' => 'fake',
            'provider_number_id' => 'fake-number-1',
            'e164_number' => '+15551234567',
            'is_default' => true,
            'is_active' => true,
        ]);
        $fax = Fax::create([
            'facility_id' => $facility->id,
            'direction' => Fax::DIRECTION_OUTBOUND,
            'provider' => 'fake',
            'provider_fax_id' => $providerFaxId,
            'from_number' => '+15551234567',
            'to_number' => '+15557654321',
            'from_number_id' => $fromNumber->id,
            'file_path' => 'faxes/test.pdf',
            'status' => $status,
        ]);

        $provider = Mockery::mock(FaxProvider::class);
        $provider->shouldReceive('send')
            ->zeroOrMoreTimes()
            ->andReturnUsing(fn () => $this->fail('Provider send should not be called for an already-sent fax retry.'));

        $manager = Mockery::mock(FaxManager::class);
        $manager->shouldReceive('settingsFor')
            ->zeroOrMoreTimes()
            ->andReturn(new FaxSetting([
                'provider' => 'fake',
                'credentials' => ['mode' => 'always_succeed'],
            ]));
        $manager->shouldReceive('recordEvent')->zeroOrMoreTimes();
        $manager->shouldReceive('forFacility')->zeroOrMoreTimes()->andReturn($provider);

        (new SendFaxJob((int) $fax->id))->handle($manager);

        $this->assertSame($status, $fax->refresh()->status);
    }

    /**
     * @return array<string, array{status: string, providerFaxId: ?string}>
     */
    public static function alreadySentFaxStates(): array
    {
        return [
            'provider id already assigned' => [
                'status' => Fax::STATUS_QUEUED,
                'providerFaxId' => 'provider-fax-123',
            ],
            'sent status already terminal' => [
                'status' => Fax::STATUS_SENT,
                'providerFaxId' => null,
            ],
            'delivered status already terminal' => [
                'status' => Fax::STATUS_DELIVERED,
                'providerFaxId' => null,
            ],
        ];
    }
}
