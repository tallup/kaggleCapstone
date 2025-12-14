<?php

namespace App\Filament\Resources\FacilityResource\Pages;

use App\Filament\Resources\FacilityResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Filament\Notifications\Notification;

class CreateFacility extends CreateRecord
{
    protected static string $resource = FacilityResource::class;

    /**
     * Get the header actions for the create page
     */
    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('cancel')
                ->label('Cancel')
                ->color('gray')
                ->url(static::getResource()::getUrl('index'))
                ->icon('heroicon-o-x-mark'),
        ];
    }

    /**
     * Mutate form data before creating the facility
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Set default values for new facilities
        $data['is_active'] = $data['is_active'] ?? true;
        $data['brochure_color'] = $data['brochure_color'] ?? 'blue';
        
        // Set the registered_by_user_id to current user (will be updated if owner is created)
        $data['registered_by_user_id'] = auth()->id();
        
        // Remove enabled_modules and owner account fields from data as they're not database fields
        unset($data['enabled_modules']);
        // Keep owner fields for afterCreate() to process
        // unset($data['owner_name'], $data['owner_email'], $data['owner_role'], $data['owner_password']);
        
        return $data;
    }

    /**
     * Handle actions after facility creation
     */
    protected function afterCreate(): void
    {
        $formData = $this->form->getState();
        
        // Sync modules after facility is created
        $enabledModules = $formData['enabled_modules'] ?? [];
        $allModules = array_keys(\App\Constants\Modules::all());
        
        $enabledCount = 0;
        foreach ($allModules as $module) {
            if (in_array($module, $enabledModules)) {
                $this->record->enableModule($module);
                $enabledCount++;
            } else {
                $this->record->disableModule($module);
            }
        }

        // Create owner account if provided
        $owner = null;
        if (!empty($formData['owner_email']) && !empty($formData['owner_name']) && !empty($formData['owner_password'])) {
            // Create initial branch first
            $branch = $this->record->branches()->create([
                'name' => 'Main Branch',
                'address' => $this->record->address,
                'is_active' => true,
            ]);

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

        // Send success notification with details
        $body = "**{$this->record->name}** has been created with {$enabledCount} module(s) enabled.";
        if ($owner) {
            $body .= " Owner account ({$owner->email}) has been created.";
        }

        Notification::make()
            ->success()
            ->title('Facility Created Successfully')
            ->body($body)
            ->icon('heroicon-o-check-circle')
            ->iconColor('success')
            ->duration(5000)
            ->send();
    }

    /**
     * Get the form actions for the create page
     */
    protected function getFormActions(): array
    {
        return [
            $this->getCreateFormAction()
                ->label('Create Facility')
                ->icon('heroicon-o-plus-circle')
                ->requiresConfirmation()
                ->modalHeading('Create New Facility')
                ->modalDescription('Are you sure you want to create this facility? All enabled modules will be activated.')
                ->modalSubmitActionLabel('Yes, Create Facility')
                ->modalIcon('heroicon-o-building-office')
                ->successNotificationTitle('Facility created successfully!'),
            
            $this->getCreateAnotherFormAction()
                ->label('Create & Create Another')
                ->icon('heroicon-o-plus')
                ->color('gray'),
            
            Actions\Action::make('cancel')
                ->label('Cancel')
                ->color('gray')
                ->url(static::getResource()::getUrl('index'))
                ->icon('heroicon-o-x-mark')
                ->requiresConfirmation()
                ->modalHeading('Cancel Facility Creation')
                ->modalDescription('Are you sure you want to cancel? All unsaved changes will be lost.')
                ->modalSubmitActionLabel('Yes, Cancel')
                ->modalIcon('heroicon-o-exclamation-triangle'),
        ];
    }

    /**
     * Get the redirect URL after creation
     */
    protected function getRedirectUrl(): string
    {
        // Redirect to the edit page of the newly created facility
        return $this->getResource()::getUrl('edit', ['record' => $this->record]);
    }

    /**
     * Get the creation notification
     */
    protected function getCreatedNotification(): ?Notification
    {
        return null; // We're handling this in afterCreate()
    }

    /**
     * Get the page heading
     */
    public function getHeading(): string
    {
        return 'Create New Facility';
    }

    /**
     * Get the page subheading
     */
    public function getSubheading(): ?string
    {
        return 'Add a new facility to the system. Configure basic information, contact details, branding, and module access.';
    }
}
