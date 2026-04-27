<?php

namespace App\Providers;

use App\Listeners\LogAuthentication;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Facility;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\Incident;
use App\Models\LeaveRequest;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\MedicationDelivery;
use App\Models\Notification;
use App\Models\PharmacyOrder;
use App\Models\PharmacySupplier;
use App\Models\Resident;
use App\Models\Shift;
use App\Models\SleepRecord;
use App\Models\User;
use App\Models\VitalSign;
use App\Observers\AppointmentObserver;
use App\Observers\AssessmentObserver;
use App\Observers\BranchObserver;
use App\Observers\ExpenseCategoryObserver;
use App\Observers\ExpenseObserver;
use App\Observers\FacilityObserver;
use App\Observers\FireDrillObserver;
use App\Observers\GroceryStatusUpdateObserver;
use App\Observers\IncidentObserver;
use App\Observers\LeaveRequestObserver;
use App\Observers\MedicationAdministrationObserver;
use App\Observers\MedicationDeliveryObserver;
use App\Observers\MedicationObserver;
use App\Observers\NotificationObserver;
use App\Observers\PharmacyOrderObserver;
use App\Observers\PharmacySupplierObserver;
use App\Observers\ResidentObserver;
use App\Observers\ShiftObserver;
use App\Observers\SleepRecordObserver;
use App\Observers\UserObserver;
use App\Observers\VitalSignObserver;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;

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
        Cashier::useCustomerModel(Facility::class);

        if (! config('mail.notifications_enabled')) {
            Config::set('mail.default', 'array');
        }

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
        Shift::observe(ShiftObserver::class);

        // Register authentication event listeners
        Event::listen(Login::class, LogAuthentication::class);
        Event::listen(Logout::class, LogAuthentication::class);
    }
}
