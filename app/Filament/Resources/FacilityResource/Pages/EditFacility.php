<?php

namespace App\Filament\Resources\FacilityResource\Pages;

use App\Filament\Resources\FacilityResource;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditFacility extends EditRecord
{
    protected static string $resource = FacilityResource::class;

    /**
     * Mount the page with the record
     */
    public function mount(int|string $record): void
    {
        parent::mount($record);

        // Load the owner relationship
        $this->record->load('owner');
    }

    /**
     * Get the header actions for the edit page
     */
    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('view')
                ->label('View Facility')
                ->icon('heroicon-o-eye')
                ->color('gray')
                ->url(fn () => static::getResource()::getUrl('index'))
                ->tooltip('Return to facilities list'),

            Actions\DeleteAction::make()
                ->label('Delete Facility')
                ->icon('heroicon-o-trash')
                ->requiresConfirmation()
                ->modalHeading('Delete Facility')
                ->modalDescription('Are you sure you want to delete this facility? This action cannot be undone and will affect all associated branches and data.')
                ->modalSubmitActionLabel('Yes, Delete Facility')
                ->successNotificationTitle('Facility deleted successfully'),
        ];
    }

    /**
     * Mutate form data before saving
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Remove enabled_modules and owner account fields from data as they're not database fields
        unset($data['enabled_modules']);
        // Keep owner fields for afterSave() to process if creating new owner
        // unset($data['owner_name'], $data['owner_email'], $data['owner_role'], $data['owner_password']);

        // Fax tab fields are persisted to the fax_settings table by
        // afterSave(); strip them out so they don't reach the facilities
        // table on update.
        unset(
            $data['fax_provider'],
            $data['fax_credentials'],
            $data['fax_credentials_preconfigured'],
            $data['fax_cost_per_page_cents'],
            $data['fax_max_file_mb'],
            $data['fax_retention_days'],
            $data['fax_is_active'],
        );

        return $data;
    }

    /**
     * Pre-populate the form with the facility's existing FaxSetting (if any)
     * so the Fax tab reflects what's currently saved.
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        return FacilityResource::hydrateFaxFormData($data, $this->record);
    }

    /**
     * Handle actions after saving the facility
     */
    protected function afterSave(): void
    {
        $formData = $this->form->getState();

        // Fax settings — only super_admin sees the tab, but the persist
        // helper short-circuits when no fax_* keys are present, so this
        // is safe for everyone.
        FacilityResource::persistFaxFormData($this->record, $formData);

        // Get current and previous module states
        $enabledModules = $formData['enabled_modules'] ?? [];
        $allModules = array_keys(\App\Constants\Modules::all());

        $enabledCount = 0;
        $disabledCount = 0;
        $changedModules = [];

        foreach ($allModules as $module) {
            $wasEnabled = $this->record->hasModuleAccess($module);
            $isEnabled = in_array($module, $enabledModules);

            if ($isEnabled) {
                $this->record->enableModule($module);
                $enabledCount++;

                if (! $wasEnabled) {
                    $changedModules[] = \App\Constants\Modules::getDisplayName($module).' (enabled)';
                }
            } else {
                $this->record->disableModule($module);
                $disabledCount++;

                if ($wasEnabled) {
                    $changedModules[] = \App\Constants\Modules::getDisplayName($module).' (disabled)';
                }
            }
        }

        // Create owner account if provided and facility doesn't have one
        if (! $this->record->owner &&
            ! empty($formData['owner_email']) &&
            ! empty($formData['owner_name']) &&
            ! empty($formData['owner_password'])) {

            // Get or create initial branch
            $branch = $this->record->branches()->first();
            if (! $branch) {
                $branch = $this->record->branches()->create([
                    'name' => 'Main Branch',
                    'address' => $this->record->address,
                    'is_active' => true,
                ]);
            }

            // Create owner account
            $owner = \App\Models\User::create([
                'name' => $formData['owner_name'],
                'email' => $formData['owner_email'],
                'password' => \Illuminate\Support\Facades\Hash::make($formData['owner_password']),
                'role' => $formData['owner_role'] ?? 'administrator',
                'facility_id' => $this->record->id,
                'assigned_branch_id' => $branch->id,
                'is_active' => true,
            ]);

            // Update facility with owner reference
            $this->record->update([
                'registered_by_user_id' => $owner->id,
            ]);
        }

        // Send detailed success notification
        $body = "**{$this->record->name}** has been updated with {$enabledCount} module(s) enabled.";

        if (! empty($changedModules)) {
            $body .= "\n\n**Module Changes:**\n".implode("\n", array_map(fn ($m) => "• {$m}", $changedModules));
        }

        Notification::make()
            ->success()
            ->title('Facility Updated Successfully')
            ->body($body)
            ->icon('heroicon-o-check-circle')
            ->iconColor('success')
            ->duration(5000)
            ->send();
    }

    /**
     * Get the form actions for the edit page
     */
    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()
                ->label('Save Changes')
                ->icon('heroicon-o-check')
                ->requiresConfirmation()
                ->modalHeading('Save Facility Changes')
                ->modalDescription('Are you sure you want to save your changes? Module access changes will take effect immediately.')
                ->modalSubmitActionLabel('Yes, Save Changes')
                ->modalIcon('heroicon-o-building-office')
                ->successNotificationTitle('Changes saved successfully!'),

            Actions\Action::make('cancel')
                ->label('Cancel')
                ->color('gray')
                ->url(static::getResource()::getUrl('index'))
                ->icon('heroicon-o-x-mark')
                ->requiresConfirmation()
                ->modalHeading('Discard Changes')
                ->modalDescription('Are you sure you want to cancel? All unsaved changes will be lost.')
                ->modalSubmitActionLabel('Yes, Discard Changes')
                ->modalIcon('heroicon-o-exclamation-triangle'),
        ];
    }

    /**
     * Get the saved notification
     */
    protected function getSavedNotification(): ?Notification
    {
        return null; // We're handling this in afterSave()
    }

    /**
     * Get the page heading
     */
    public function getHeading(): string
    {
        return 'Edit Facility: '.$this->record->name;
    }

    /**
     * Get the page subheading
     */
    public function getSubheading(): ?string
    {
        $branchCount = $this->record->branches()->count();
        $userCount = $this->record->users()->count();

        return "Manage facility settings and module access. This facility has {$branchCount} branch(es) and {$userCount} user(s).";
    }
}
