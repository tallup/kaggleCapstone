<?php

namespace App\Console\Commands;

use App\Models\Facility;
use Illuminate\Console\Command;

class EnablePharmacyModule extends Command
{
    protected $signature = 'pharmacy:enable {facility_id? : The ID of the facility to enable the module for. If not provided, enables for all facilities.}';
    protected $description = 'Enable the Pharmacy module for a facility or all facilities';

    public function handle()
    {
        $facilityId = $this->argument('facility_id');

        if ($facilityId) {
            $facility = Facility::find($facilityId);
            if (!$facility) {
                $this->error("Facility with ID {$facilityId} not found.");
                return 1;
            }
            $facility->enableModule('pharmacy');
            $this->info("Pharmacy module enabled for facility: {$facility->name} (ID: {$facility->id})");
        } else {
            $facilities = Facility::all();
            $count = 0;
            foreach ($facilities as $facility) {
                $facility->enableModule('pharmacy');
                $count++;
            }
            $this->info("Pharmacy module enabled for {$count} facility(ies).");
        }

        return 0;
    }
}






















