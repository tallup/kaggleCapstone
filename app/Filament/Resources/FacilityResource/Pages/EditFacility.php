<?php

namespace App\Filament\Resources\FacilityResource\Pages;

use App\Filament\Resources\FacilityResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Filament\Notifications\Notification;

class EditFacility extends EditRecord
{
    protected static string $resource = FacilityResource::class;

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
        // Remove enabled_modules from data as it's not a database field
        unset($data['enabled_modules']);
        return $data;
    }

    /**
     * Handle actions after saving the facility
     */
    protected function afterSave(): void
    {
        // Get current and previous module states
        $enabledModules = $this->form->getState()['enabled_modules'] ?? [];
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
                
                if (!$wasEnabled) {
                    $changedModules[] = \App\Constants\Modules::getDisplayName($module) . ' (enabled)';
                }
            } else {
                $this->record->disableModule($module);
                $disabledCount++;
                
                if ($wasEnabled) {
                    $changedModules[] = \App\Constants\Modules::getDisplayName($module) . ' (disabled)';
                }
            }
        }

        // Send detailed success notification
        $body = "**{$this->record->name}** has been updated with {$enabledCount} module(s) enabled.";
        
        if (!empty($changedModules)) {
            $body .= "\n\n**Module Changes:**\n" . implode("\n", array_map(fn($m) => "• {$m}", $changedModules));
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
        return 'Edit Facility: ' . $this->record->name;
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
