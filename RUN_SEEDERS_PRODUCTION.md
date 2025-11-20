# Running Seeders on Production

## New Seeders Available

1. **FireDrillSeeder** - Creates fire drill test data
2. **MedicationDeliverySeeder** - Creates medication delivery test data
3. **GroceryStatusUpdateSeeder** - Creates grocery status update test data

## Commands to Run on Production

### Option 1: Run Individual Seeders (Recommended)

```bash
# SSH into production server first, then:

# Run Fire Drill seeder
php artisan db:seed --class=FireDrillSeeder

# Run Medication Delivery seeder
php artisan db:seed --class=MedicationDeliverySeeder

# Run Grocery Status Update seeder
php artisan db:seed --class=GroceryStatusUpdateSeeder
```

### Option 2: Run All Seeders at Once

```bash
# This will run ALL seeders including existing ones
php artisan db:seed
```

### Option 3: Run Only New Seeders (Selective)

```bash
# Run only the three new seeders
php artisan db:seed --class=FireDrillSeeder --class=MedicationDeliverySeeder --class=GroceryStatusUpdateSeeder
```

**Note**: Laravel doesn't support multiple `--class` flags. Use Option 1 instead.

## What Each Seeder Creates

### FireDrillSeeder
- Creates 3 fire drills per active branch:
  - 1 scheduled for next week (1 day before alert)
  - 1 scheduled for tomorrow (1 day before alert)
  - 1 completed drill from last month
- **Total**: ~30 fire drills (if 10 branches exist)

### MedicationDeliverySeeder
- Creates 5 individual medication deliveries per branch (if medications exist)
- Creates 3 batch deliveries per branch
- **Total**: ~32 medication deliveries (if 4 branches exist)

### GroceryStatusUpdateSeeder
- Creates 1-2 updates per week for current week and past 3 weeks
- Per branch
- **Total**: ~58 grocery status updates (if 4 branches exist)

## Prerequisites

Before running seeders, ensure:
- ✅ All migrations have been run
- ✅ Branches exist in database
- ✅ Users exist in database (for `created_by`, `received_by`, `updated_by` fields)
- ✅ For MedicationDeliverySeeder: Residents and Medications should exist

## Verification After Seeding

```bash
# Check counts
php artisan tinker --execute="
echo 'Fire Drills: ' . App\Models\FireDrill::count() . PHP_EOL;
echo 'Medication Deliveries: ' . App\Models\MedicationDelivery::count() . PHP_EOL;
echo 'Grocery Status Updates: ' . App\Models\GroceryStatusUpdate::count() . PHP_EOL;
"
```

## Safety Notes

⚠️ **Important**: 
- Seeders will create NEW records - they won't delete existing data
- If you run seeders multiple times, you'll get duplicate data
- Seeders require existing data (branches, users, residents, medications) to work properly
- Consider running during low-traffic periods

## Laravel Forge Deployment Script

If you want to add this to your Forge deployment script:

```bash
# Add to your deployment script (after migrations)
php artisan db:seed --class=FireDrillSeeder
php artisan db:seed --class=MedicationDeliverySeeder
php artisan db:seed --class=GroceryStatusUpdateSeeder
```

**Note**: This will run seeders on EVERY deployment. Consider if you want this behavior.

## Alternative: One-Time Manual Run

If you only want to run seeders once (not on every deployment):

1. SSH into production server
2. Navigate to project directory
3. Run seeders manually using Option 1 commands above




