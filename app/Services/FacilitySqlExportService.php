<?php

namespace App\Services;

use App\Models\Facility;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Exports tenant-scoped rows as INSERT statements for a single facility.
 * When adding new tenant-owned tables, append to {@see self::tableManifest()} in parent-before-child order.
 */
class FacilitySqlExportService
{
    public function __construct(
        private FacilityTenantScopeResolver $scopeResolver
    ) {}

    /**
     * @return array{success: bool, filename?: string, size?: string, created_at?: string, message?: string, path?: string}
     */
    public function export(int $facilityId, bool $scheduled = false): array
    {
        if (! Facility::withoutGlobalScopes()->whereKey($facilityId)->exists()) {
            return ['success' => false, 'message' => 'Facility not found.'];
        }

        $scope = $this->scopeResolver->resolve($facilityId);

        $dir = storage_path('app/backups/facilities/'.$facilityId);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        $prefix = $scheduled ? 'backup_auto_facility_' : 'backup_facility_';
        $filename = "{$prefix}{$facilityId}_{$timestamp}.sql";
        $path = $dir.'/'.$filename;

        $handle = fopen($path, 'wb');
        if ($handle === false) {
            return ['success' => false, 'message' => 'Could not open backup file for writing.'];
        }

        try {
            $this->writeHeader($handle, $facilityId);
            foreach ($this->tableManifest() as $entry) {
                $table = $entry['table'];
                if (! FacilityTenantScopeResolver::tableExists($table)) {
                    continue;
                }
                $builder = $entry['query']($scope);
                if ($builder === null) {
                    continue;
                }
                $this->streamInserts($handle, $table, $builder);
            }
            fwrite($handle, "\nSET FOREIGN_KEY_CHECKS=1;\n");
        } catch (Throwable $e) {
            fclose($handle);
            @unlink($path);
            Log::error('Facility SQL export failed', ['facility_id' => $facilityId, 'error' => $e->getMessage()]);

            return ['success' => false, 'message' => 'Export failed: '.$e->getMessage()];
        }

        fclose($handle);

        $size = filesize($path);
        if ($size === 0) {
            @unlink($path);

            return ['success' => false, 'message' => 'Facility backup produced an empty file.'];
        }

        if ($scheduled) {
            $this->pruneScheduledFacilityBackups($facilityId);
        }

        return [
            'success' => true,
            'filename' => $filename,
            'path' => $path,
            'size' => $this->formatBytes($size),
            'created_at' => Carbon::now()->toIso8601String(),
        ];
    }

    private function pruneScheduledFacilityBackups(int $facilityId): void
    {
        $keep = max(1, (int) config('backup.scheduled_keep', 30));
        $dir = storage_path('app/backups/facilities/'.$facilityId);
        if (! is_dir($dir)) {
            return;
        }
        $pattern = $dir.'/backup_auto_facility_'.$facilityId.'_*.sql';
        $files = glob($pattern) ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        foreach (array_slice($files, $keep) as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function writeHeader($handle, int $facilityId): void
    {
        $app = config('app.name', 'Laravel');
        $ver = config('app.version', '1');
        $line = '-- HL360_FACILITY_BACKUP facility_id='.$facilityId.' exported_at='.Carbon::now()->toIso8601String().' app='.$app.' version='.$ver."\n";
        fwrite($handle, $line);
        fwrite($handle, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n");
    }

    /**
     * Parent-before-child order for INSERT. Delete uses reverse order.
     * Public so {@see FacilitySqlImportService} can mirror delete order.
     *
     * @return array<int, array{table: string, query: callable(FacilityTenantScope): Builder|null}>
     */
    public function tableManifest(): array
    {
        return [
            ['table' => 'facilities', 'query' => fn (FacilityTenantScope $s) => DB::table('facilities')->where('id', $s->facilityId)],
            ['table' => 'branches', 'query' => fn (FacilityTenantScope $s) => DB::table('branches')->where('facility_id', $s->facilityId)],
            ['table' => 'facility_settings', 'query' => fn (FacilityTenantScope $s) => DB::table('facility_settings')->where('facility_id', $s->facilityId)],
            ['table' => 'facility_modules', 'query' => fn (FacilityTenantScope $s) => DB::table('facility_modules')->where('facility_id', $s->facilityId)],
            ['table' => 'facility_role_permissions', 'query' => fn (FacilityTenantScope $s) => DB::table('facility_role_permissions')->where('facility_id', $s->facilityId)],
            ['table' => 'expense_categories', 'query' => fn (FacilityTenantScope $s) => DB::table('expense_categories')->where('facility_id', $s->facilityId)],
            ['table' => 'payment_notification_preferences', 'query' => fn (FacilityTenantScope $s) => DB::table('payment_notification_preferences')->where('facility_id', $s->facilityId)],
            ['table' => 'email_templates', 'query' => fn (FacilityTenantScope $s) => DB::table('email_templates')->where('facility_id', $s->facilityId)],
            ['table' => 'email_notification_configs', 'query' => fn (FacilityTenantScope $s) => DB::table('email_notification_configs')->where('facility_id', $s->facilityId)],
            ['table' => 'pharmacy_templates', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('pharmacy_templates')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'fire_drill_templates', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('fire_drill_templates')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'grocery_item_templates', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('grocery_item_templates')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'users', 'query' => fn (FacilityTenantScope $s) => DB::table('users')->where(function ($q) use ($s) {
                $q->where('facility_id', $s->facilityId);
                if ($s->branchIds !== []) {
                    $q->orWhereIn('assigned_branch_id', $s->branchIds);
                }
            })],
            ['table' => 'model_has_roles', 'query' => fn (FacilityTenantScope $s) => $s->hasUsers()
                ? DB::table('model_has_roles')->where('model_type', User::class)->whereIn('model_id', $s->userIds)
                : null],
            ['table' => 'staff_email_preferences', 'query' => fn (FacilityTenantScope $s) => $s->hasUsers()
                ? DB::table('staff_email_preferences')->whereIn('user_id', $s->userIds)
                : null],
            ['table' => 'user_push_subscriptions', 'query' => fn (FacilityTenantScope $s) => $s->hasUsers()
                ? DB::table('user_push_subscriptions')->whereIn('user_id', $s->userIds)
                : null],
            ['table' => 'residents', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('residents')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'drugs', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('medications') && FacilityTenantScopeResolver::tableExists('drugs')
                ? DB::table('drugs')->whereIn('id', function ($q) use ($s) {
                    $q->select('drug_id')->from('medications')->whereIn('resident_id', $s->residentIds)->whereNotNull('drug_id');
                })
                : null],
            // Catalog table: no resident_id; scope by providers linked from this facility's appointments.
            ['table' => 'healthcare_providers', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('appointments')
                ? DB::table('healthcare_providers')->whereIn('id', function ($q) use ($s) {
                    $q->select('healthcare_provider_id')->from('appointments')->whereIn('resident_id', $s->residentIds)->whereNotNull('healthcare_provider_id');
                })
                : null],
            ['table' => 'assignments', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('assignments')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'medications', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('medications')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'medication_administrations', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('medication_administrations')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'medication_deliveries', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('medication_deliveries')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'vital_signs', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('vital_signs')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'appointments', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('appointments')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'assessments', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('assessments')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'sleep_patterns', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('sleep_patterns')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'sleep_hourly_data', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('sleep_patterns')
                ? DB::table('sleep_hourly_data')->whereIn('sleep_pattern_id', function ($q) use ($s) {
                    $q->select('id')->from('sleep_patterns')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'sleep_records', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('sleep_records')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'leave_requests', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('leave_requests')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'behaviors', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('behaviors')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'behavior_charts', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('behavior_charts')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'behavior_chart_items', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('behavior_charts')
                ? DB::table('behavior_chart_items')->whereIn('behavior_chart_id', function ($q) use ($s) {
                    $q->select('id')->from('behavior_charts')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'behavior_chart_logs', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('behavior_charts')
                ? DB::table('behavior_chart_logs')->whereIn('behavior_chart_id', function ($q) use ($s) {
                    $q->select('id')->from('behavior_charts')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'incidents', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('incidents')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'incident_attachments', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('incidents')
                ? DB::table('incident_attachments')->whereIn('incident_id', function ($q) use ($s) {
                    $q->select('id')->from('incidents')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 't_logs', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('t_logs')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 't_log_attachments', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('t_logs')
                ? DB::table('t_log_attachments')->whereIn('t_log_id', function ($q) use ($s) {
                    $q->select('id')->from('t_logs')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'cleaning_areas', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('cleaning_areas')->whereIn('branch_id', $s->branchIds)
                : null],
            // Tasks belong to cleaning_areas (areas have branch_id), not branches directly.
            ['table' => 'cleaning_tasks', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('cleaning_tasks')->whereIn('cleaning_area_id', function ($q) use ($s) {
                    $q->select('id')->from('cleaning_areas')->whereIn('branch_id', $s->branchIds);
                })
                : null],
            ['table' => 'cleaning_task_assignments', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches() && FacilityTenantScopeResolver::tableExists('cleaning_tasks')
                ? DB::table('cleaning_task_assignments')->whereIn('cleaning_task_id', function ($q) use ($s) {
                    $q->select('id')->from('cleaning_tasks')->whereIn('cleaning_area_id', function ($q2) use ($s) {
                        $q2->select('id')->from('cleaning_areas')->whereIn('branch_id', $s->branchIds);
                    });
                })
                : null],
            ['table' => 'cleaning_task_logs', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('cleaning_task_logs')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'reminders', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('reminders')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'reminder_events', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches() && FacilityTenantScopeResolver::tableExists('reminders')
                ? DB::table('reminder_events')->whereIn('reminder_id', function ($q) use ($s) {
                    $q->select('id')->from('reminders')->whereIn('branch_id', $s->branchIds);
                })
                : null],
            ['table' => 'pharmacy_inventory', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('pharmacy_inventory')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'pharmacy_stock_lots', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('pharmacy_stock_lots')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'pharmacy_orders', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('pharmacy_orders')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'pharmacy_order_items', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches() && FacilityTenantScopeResolver::tableExists('pharmacy_orders')
                ? DB::table('pharmacy_order_items')->whereIn('pharmacy_order_id', function ($q) use ($s) {
                    $q->select('id')->from('pharmacy_orders')->whereIn('branch_id', $s->branchIds);
                })
                : null],
            ['table' => 'pharmacy_stock_transactions', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('pharmacy_stock_transactions')->where(function ($q) use ($s) {
                    $q->whereIn('branch_id', $s->branchIds)
                        ->orWhereIn('pharmacy_order_id', function ($q2) use ($s) {
                            $q2->select('id')->from('pharmacy_orders')->whereIn('branch_id', $s->branchIds);
                        });
                })
                : null],
            ['table' => 'pharmacy_suppliers', 'query' => fn (FacilityTenantScope $s) => $s->hasUsers()
                ? DB::table('pharmacy_suppliers')->whereIn('created_by', $s->userIds)
                : null],
            ['table' => 'fire_drills', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('fire_drills')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'grocery_status_updates', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('grocery_status_updates')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'billing_invoices', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('billing_invoices')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'invoice_items', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('billing_invoices')
                ? DB::table('invoice_items')->whereIn('billing_invoice_id', function ($q) use ($s) {
                    $q->select('id')->from('billing_invoices')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'expenses', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('expenses')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'expense_approvals', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents() && FacilityTenantScopeResolver::tableExists('expenses')
                ? DB::table('expense_approvals')->whereIn('expense_id', function ($q) use ($s) {
                    $q->select('id')->from('expenses')->whereIn('resident_id', $s->residentIds);
                })
                : null],
            ['table' => 'visitors', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('visitors')->whereIn('visiting_resident_id', $s->residentIds)
                : null],
            ['table' => 'resident_sign_outs', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('resident_sign_outs')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'family_messages', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('family_messages')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'resident_contacts', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('resident_contacts')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'resident_documents', 'query' => fn (FacilityTenantScope $s) => $s->hasResidents()
                ? DB::table('resident_documents')->whereIn('resident_id', $s->residentIds)
                : null],
            ['table' => 'staff_clock_ins', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('staff_clock_ins')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'shifts', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('shifts')->whereIn('branch_id', $s->branchIds)
                : null],
            ['table' => 'staff_availability', 'query' => fn (FacilityTenantScope $s) => DB::table('staff_availability')->where(function ($q) use ($s) {
                $q->where('facility_id', $s->facilityId);
                if ($s->userIds !== []) {
                    $q->orWhereIn('user_id', $s->userIds);
                }
            })],
            ['table' => 'activity_logs', 'query' => fn (FacilityTenantScope $s) => $s->hasBranches()
                ? DB::table('activity_logs')->whereIn('branch_id', $s->branchIds)
                : null],
        ];
    }

    private function streamInserts($handle, string $table, Builder $query): void
    {
        $query->orderBy($this->orderColumnFor($table))->chunk(500, function ($rows) use ($handle, $table) {
            foreach ($rows as $row) {
                $line = $this->buildInsert($table, (array) $row);
                fwrite($handle, $line."\n");
            }
        });
    }

    private function orderColumnFor(string $table): string
    {
        if (DB::getSchemaBuilder()->hasColumn($table, 'id')) {
            return 'id';
        }

        return DB::getSchemaBuilder()->getColumnListing($table)[0] ?? 'id';
    }

    private function buildInsert(string $table, array $row): string
    {
        $cols = array_keys($row);
        $quotedCols = array_map(fn ($c) => '`'.str_replace('`', '``', $c).'`', $cols);
        $vals = array_map(fn ($v) => $this->quoteValue($v), $row);

        return 'INSERT INTO `'.str_replace('`', '``', $table).'` ('.implode(', ', $quotedCols).') VALUES ('.implode(', ', $vals).');';
    }

    private function quoteValue(mixed $v): string
    {
        if ($v === null) {
            return 'NULL';
        }
        if ($v instanceof \DateTimeInterface) {
            return "'".$v->format('Y-m-d H:i:s')."'";
        }
        if (is_bool($v)) {
            return $v ? '1' : '0';
        }
        if (is_int($v) || is_float($v)) {
            return (string) $v;
        }

        return DB::connection()->getPdo()->quote((string) $v);
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision).' '.$units[$i];
    }
}
