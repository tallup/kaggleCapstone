<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use App\Models\Facility;
use App\Models\Fax;
use App\Models\FaxContact;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\MedicationDelivery;
use App\Models\PharmacyInventory;
use App\Models\PharmacySupplier;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Idempotent backfill for residents/facilities that are missing demo data
 * because they were created after (or skipped by) the original name-keyed
 * seeders. Safe to re-run: every write is guarded by an existence check.
 */
class DemoDataBackfillSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Backfilling demo data (vitals, medications, faxes)...');

        // VitalSignSeeder already targets every active resident and skips
        // dates that already have a record, so re-running it just fills gaps.
        $this->call(VitalSignSeeder::class);

        $this->backfillMedications();
        $this->backfillFaxes();

        // Reference/operational data whose seeders exist but were never
        // wired into the production seed chain, or that skip branches
        // created after the original seed run.
        $this->call(HousekeepingSeeder::class);
        $this->call(BehaviorDefinitionSeeder::class);
        $this->call(BackfillBranchResidentsSeeder::class);

        $this->backfillIfEmpty(FireDrill::class, FireDrillSeeder::class);
        $this->backfillIfEmpty(GroceryStatusUpdate::class, GroceryStatusUpdateSeeder::class);
        $this->backfillIfEmpty(ExpenseCategory::class, ExpenseCategorySeeder::class);
        $this->backfillIfEmpty(PharmacySupplier::class, PharmacySupplierSeeder::class);
        $this->backfillIfEmpty(PharmacyInventory::class, PharmacyInventorySeeder::class);
        // Runs after backfillMedications() so residents that just got a
        // medication above are eligible for a delivery record too.
        $this->backfillIfEmpty(MedicationDelivery::class, MedicationDeliverySeeder::class);

        $this->command->info('Demo data backfill complete.');
    }

    /**
     * These underlying seeders use plain create() calls (not firstOrCreate),
     * so re-running them would duplicate rows. Only seed once per table.
     */
    private function backfillIfEmpty(string $modelClass, string $seederClass): void
    {
        if ($modelClass::count() > 0) {
            $this->command->info(class_basename($modelClass).' already has data; skipping '.class_basename($seederClass).'.');
            return;
        }

        $this->call($seederClass);
    }

    private function backfillMedications(): void
    {
        $admin = User::where('email', 'admin@edmondserenity.com')->first() ?? User::first();

        if (!$admin) {
            $this->command->warn('No admin user found; skipping medication backfill.');
            return;
        }

        $genericMedications = [
            ['name' => 'Multivitamin', 'instructions' => 'a.m', 'diagnosis' => 'General Health Maintenance'],
            ['name' => 'Omeprazole', 'instructions' => 'a.m', 'diagnosis' => 'GERD'],
            ['name' => 'Amlodipine', 'instructions' => 'a.m', 'diagnosis' => 'Hypertension'],
            ['name' => 'Levothyroxine', 'instructions' => 'a.m', 'diagnosis' => 'Hypothyroidism'],
            ['name' => 'Sertraline', 'instructions' => 'a.m', 'diagnosis' => 'Depression/Anxiety'],
        ];

        $residentsWithoutMeds = Resident::where('is_active', true)
            ->whereDoesntHave('medicationOrders')
            ->get();

        if ($residentsWithoutMeds->isEmpty()) {
            $this->command->info('Every active resident already has medications on file.');
            return;
        }

        foreach ($residentsWithoutMeds as $index => $resident) {
            $pick = $genericMedications[$index % count($genericMedications)];

            $medication = Medication::create([
                'resident_id' => $resident->id,
                'branch_id' => $resident->branch_id,
                'drug_id' => null,
                'name' => $pick['name'],
                'instructions' => $pick['instructions'],
                'quantity' => 30,
                'diagnosis' => $pick['diagnosis'],
                'prescription_date' => Carbon::now()->subDays(30),
                'start_date' => Carbon::now()->subDays(29),
                'end_date' => Carbon::now()->addDays(60),
                'notes' => 'Routine maintenance medication.',
                'is_active' => true,
                'time_1' => '08:00:00',
                'time_2' => null,
                'time_3' => null,
                'time_4' => null,
                'created_by' => $admin->id,
            ]);

            for ($i = 0; $i < 14; $i++) {
                $administeredAt = Carbon::now()->subDays($i)->setTime(8, rand(0, 30));

                MedicationAdministration::create([
                    'medication_id' => $medication->id,
                    'resident_id' => $resident->id,
                    'administered_by' => $admin->id,
                    'administered_at' => $administeredAt,
                    'status' => $i === 3 ? 'missed' : 'taken',
                    'dosage_given' => '1 tablet',
                    'notes' => 'Administered as scheduled.',
                    'branch_id' => $resident->branch_id,
                    'created_at' => $administeredAt,
                    'updated_at' => $administeredAt,
                ]);
            }

            $this->command->line("  + {$pick['name']} for {$resident->name}");
        }
    }

    private function backfillFaxes(): void
    {
        Facility::all()->each(function (Facility $facility) {
            if (Fax::where('facility_id', $facility->id)->exists()) {
                return;
            }

            $admin = User::where('facility_id', $facility->id)->first()
                ?? User::where('email', 'admin@edmondserenity.com')->first();

            $pharmacy = FaxContact::firstOrCreate(
                ['facility_id' => $facility->id, 'fax_e164' => '+12065550199'],
                [
                    'name' => 'Riverside Pharmacy',
                    'organization' => 'Riverside Pharmacy',
                    'contact_type' => 'pharmacy',
                    'is_active' => true,
                    'created_by' => $admin?->id,
                ]
            );

            $physician = FaxContact::firstOrCreate(
                ['facility_id' => $facility->id, 'fax_e164' => '+12065550122'],
                [
                    'name' => 'Dr. Alan Reyes',
                    'organization' => 'Edmond Family Medicine',
                    'contact_type' => 'physician',
                    'is_active' => true,
                    'created_by' => $admin?->id,
                ]
            );

            $ourNumber = '+12065550100';

            $samples = [
                [
                    'direction' => Fax::DIRECTION_OUTBOUND,
                    'contact' => $pharmacy,
                    'fax_type' => 'orders',
                    'subject' => 'Medication refill request',
                    'status' => Fax::STATUS_DELIVERED,
                    'sent_at' => now()->subDays(2),
                ],
                [
                    'direction' => Fax::DIRECTION_INBOUND,
                    'contact' => $pharmacy,
                    'fax_type' => 'orders',
                    'subject' => 'Refill confirmation',
                    'status' => Fax::STATUS_RECEIVED,
                    'received_at' => now()->subDays(1),
                ],
                [
                    'direction' => Fax::DIRECTION_OUTBOUND,
                    'contact' => $physician,
                    'fax_type' => 'records',
                    'subject' => 'Requested chart records',
                    'status' => Fax::STATUS_SENT,
                    'sent_at' => now()->subHours(20),
                ],
                [
                    'direction' => Fax::DIRECTION_INBOUND,
                    'contact' => $physician,
                    'fax_type' => 'records',
                    'subject' => 'Signed care plan',
                    'status' => Fax::STATUS_READ,
                    'received_at' => now()->subHours(6),
                ],
            ];

            foreach ($samples as $sample) {
                $isOutbound = $sample['direction'] === Fax::DIRECTION_OUTBOUND;

                Fax::create([
                    'facility_id' => $facility->id,
                    'direction' => $sample['direction'],
                    'provider' => 'demo',
                    'from_number' => $isOutbound ? $ourNumber : $sample['contact']->fax_e164,
                    'to_number' => $isOutbound ? $sample['contact']->fax_e164 : $ourNumber,
                    'contact_id' => $sample['contact']->id,
                    'fax_type' => $sample['fax_type'],
                    'subject' => $sample['subject'],
                    'page_count' => rand(1, 4),
                    'status' => $sample['status'],
                    'sent_by_user_id' => $isOutbound ? $admin?->id : null,
                    'sent_at' => $sample['sent_at'] ?? null,
                    'received_at' => $sample['received_at'] ?? null,
                    'is_phi' => true,
                ]);
            }

            $this->command->line('  + '.count($samples)." sample faxes for {$facility->name}");
        });
    }
}
