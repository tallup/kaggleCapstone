<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\DB;
use App\Models\Appointment;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Assessment;
use App\Models\LeaveRequest;
use App\Models\VitalSign;
use App\Models\Incident;
use App\Models\SleepRecord;
use App\Models\Resident;
use App\Models\User;
use App\Models\Facility;
use App\Models\Branch;
use App\Models\ExpenseCategory;
use App\Observers\AppointmentObserver;
use App\Observers\MedicationObserver;
use App\Observers\MedicationAdministrationObserver;
use App\Observers\AssessmentObserver;
use App\Observers\LeaveRequestObserver;
use App\Observers\VitalSignObserver;
use App\Observers\IncidentObserver;
use App\Observers\SleepRecordObserver;
use App\Observers\ResidentObserver;
use App\Observers\UserObserver;
use App\Observers\FacilityObserver;
use App\Observers\BranchObserver;
use App\Observers\FireDrillObserver;
use App\Models\FireDrill;
use App\Observers\ExpenseObserver;
use App\Models\Expense;
use App\Observers\ExpenseCategoryObserver;
use App\Observers\PharmacyOrderObserver;
use App\Observers\MedicationDeliveryObserver;
use App\Observers\PharmacySupplierObserver;
use App\Models\PharmacyOrder;
use App\Models\MedicationDelivery;
use App\Models\PharmacySupplier;
use App\Models\GroceryStatusUpdate;
use App\Observers\GroceryStatusUpdateObserver;
use App\Models\Notification;
use App\Observers\NotificationObserver;
use App\Listeners\LogAuthentication;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Optimize SQLite for better performance in development
        if (config('database.default') === 'sqlite') {
            DB::statement('PRAGMA journal_mode=WAL;');
            DB::statement('PRAGMA synchronous=NORMAL;');
            DB::statement('PRAGMA busy_timeout=5000;');
            DB::statement('PRAGMA temp_store=MEMORY;');
            DB::statement('PRAGMA mmap_size=268435456;'); // 256MB memory-mapped I/O
        }
        
        // Register all model observers
        Appointment::observe(AppointmentObserver::class);
        Medication::observe(MedicationObserver::class);
        MedicationAdministration::observe(MedicationAdministrationObserver::class);
        Assessment::observe(AssessmentObserver::class);
        LeaveRequest::observe(LeaveRequestObserver::class);
        VitalSign::observe(VitalSignObserver::class);
        Incident::observe(IncidentObserver::class);
        SleepRecord::observe(SleepRecordObserver::class);
        Resident::observe(ResidentObserver::class);
        User::observe(UserObserver::class);
        Facility::observe(FacilityObserver::class);
        Branch::observe(BranchObserver::class);
        FireDrill::observe(FireDrillObserver::class);
        Expense::observe(ExpenseObserver::class);
        ExpenseCategory::observe(ExpenseCategoryObserver::class);
        PharmacyOrder::observe(PharmacyOrderObserver::class);
        MedicationDelivery::observe(MedicationDeliveryObserver::class);
        PharmacySupplier::observe(PharmacySupplierObserver::class);
        GroceryStatusUpdate::observe(GroceryStatusUpdateObserver::class);
        Notification::observe(NotificationObserver::class);
        
        // Register authentication event listeners
        Event::listen(Login::class, LogAuthentication::class);
        Event::listen(Logout::class, LogAuthentication::class);
    }
}
