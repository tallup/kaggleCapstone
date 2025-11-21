<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FacilityResource\Pages;
use App\Filament\Resources\FacilityResource\RelationManagers;
use App\Models\Facility;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class FacilityResource extends Resource
{
    protected static ?string $model = Facility::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-office';
    protected static ?string $navigationLabel = 'Facilities';
    protected static ?string $modelLabel = 'Facility';
    protected static ?string $pluralModelLabel = 'Facilities';
    protected static ?string $navigationGroup = 'Administration';
    protected static bool $shouldRegisterNavigation = false; // Handled by CustomNavigationProvider

    public static function shouldRegisterNavigation(): bool
    {
        // Only register if user has permission AND is not a caregiver
        if (!auth()->check()) {
            return false;
        }
        
        $user = auth()->user();
        
        // Caregivers should NEVER see this in navigation
        $roleValue = strtolower(trim($user->role ?? ''));
        $roleValueNormalized = str_replace([' ', '_'], '', $roleValue);
        $isCaregiver = $user->hasRole('caregiver') || 
                       $user->hasRole('care_giver') || 
                       $roleValueNormalized === 'caregiver' ||
                       (stripos($roleValue, 'care') !== false && stripos($roleValue, 'giver') !== false);
        
        if ($isCaregiver) {
            return false;
        }
        
        return $user->hasPermission('view_facilities');
    }

    public static function canViewAny(): bool
    {
        $user = auth()->user();
        return $user->role === 'super_admin' || $user->hasPermission('view_facilities');
    }

    public static function canCreate(): bool
    {
        $user = auth()->user();
        return $user->role === 'super_admin' || $user->hasPermission('create_facilities');
    }

    public static function canEdit($record): bool
    {
        $user = auth()->user();
        return $user->role === 'super_admin' || $user->hasPermission('edit_facilities');
    }

    public static function canDelete($record): bool
    {
        $user = auth()->user();
        return $user->role === 'super_admin' || $user->hasPermission('delete_facilities');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Facility Information')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Facility Name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter facility name'),
                        Forms\Components\TextInput::make('location')
                            ->label('Location')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter city, state'),
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->rows(4)
                            ->placeholder('Enter facility description...'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Contact Information')
                    ->schema([
                        Forms\Components\Textarea::make('address')
                            ->label('Address')
                            ->rows(3)
                            ->placeholder('Enter full address...'),
                        Forms\Components\TextInput::make('phone')
                            ->label('Phone')
                            ->tel()
                            ->placeholder('(206) 555-0123'),
                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->placeholder('info@example.com'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Marketing Information')
                    ->schema([
                        Forms\Components\TextInput::make('brochure_url')
                            ->label('Brochure URL')
                            ->url()
                            ->placeholder('https://example.com/brochure.pdf'),
                        Forms\Components\Select::make('brochure_color')
                            ->label('Brochure Color Theme')
                            ->options([
                                'blue' => 'Blue',
                                'green' => 'Green',
                                'purple' => 'Purple',
                                'red' => 'Red',
                            ])
                            ->default('blue')
                            ->required(),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Facility')
                            ->default(true)
                            ->helperText('Enable this facility for use'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Branding & Customization')
                    ->schema([
                        Forms\Components\FileUpload::make('logo')
                            ->label('Facility Logo')
                            ->image()
                            ->directory('facilities/logos')
                            ->disk('public')
                            ->imageEditor()
                            ->helperText('Upload a logo for this facility. Will be displayed in the admin panel.'),
                        Forms\Components\TextInput::make('subdomain')
                            ->label('Subdomain')
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->helperText('Optional subdomain for facility-specific URL (e.g., evergreen.yourapp.com)'),
                        Forms\Components\TextInput::make('provider_code')
                            ->label('Provider Code')
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->helperText('Optional provider code used for login identification. Users can enter this code during login to identify their facility.'),
                        Forms\Components\ColorPicker::make('primary_color')
                            ->label('Primary Color')
                            ->helperText('Main brand color for the admin panel'),
                        Forms\Components\ColorPicker::make('secondary_color')
                            ->label('Secondary Color')
                            ->helperText('Secondary brand color'),
                        Forms\Components\ColorPicker::make('accent_color')
                            ->label('Accent Color')
                            ->helperText('Accent color for highlights'),
                    ])
                    ->columns(2)
                    ->visible(fn () => auth()->user()->role === 'super_admin'),

                Forms\Components\Section::make('Module Access')
                    ->schema([
                        Forms\Components\CheckboxList::make('enabled_modules')
                            ->label('Enabled Modules')
                            ->options(\App\Constants\Modules::all())
                            ->columns(2)
                            ->gridDirection('row')
                            ->bulkToggleable()
                            ->helperText('Select which modules are available for this facility. Users must have both role permissions and facility module access.')
                            ->default(function ($record) {
                                if (!$record) {
                                    return array_keys(\App\Constants\Modules::all());
                                }
                                return $record->modules()
                                    ->where('is_enabled', true)
                                    ->pluck('module')
                                    ->toArray();
                            })
                            ->dehydrated(true),
                    ])
                    ->visible(fn () => auth()->user()->role === 'super_admin')
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Facility Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('location')
                    ->label('Location')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 50 ? $state : null;
                    }),
                Tables\Columns\TextColumn::make('brochure_color')
                    ->label('Theme')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'blue' => 'info',
                        'green' => 'success',
                        'purple' => 'warning',
                        'red' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('branches_count')
                    ->label('Branches')
                    ->counts('branches')
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Status')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger'),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All facilities')
                    ->trueLabel('Active facilities')
                    ->falseLabel('Inactive facilities'),
                Tables\Filters\SelectFilter::make('brochure_color')
                    ->label('Theme Color')
                    ->options([
                        'blue' => 'Blue',
                        'green' => 'Green',
                        'purple' => 'Purple',
                        'red' => 'Red',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('name');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFacilities::route('/'),
            'create' => Pages\CreateFacility::route('/create'),
            'view' => Pages\ViewFacility::route('/{record}'),
            'edit' => Pages\EditFacility::route('/{record}/edit'),
        ];
    }
}
