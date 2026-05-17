<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FacilityResource\Pages;
use App\Filament\Resources\FacilityResource\RelationManagers;
use App\Models\Facility;
use App\Services\LocationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Log;

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
        if (! auth()->check()) {
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
                Forms\Components\Tabs::make('FacilityTabs')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Overview')
                            ->icon('heroicon-o-home')
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

                                Forms\Components\Section::make('Location Coordinates')
                                    ->description('Coordinates are used for location-based login restrictions. Click "Geocode from Address" to automatically populate coordinates.')
                                    ->schema([
                                        Forms\Components\TextInput::make('latitude')
                                            ->label('Latitude')
                                            ->numeric()
                                            ->step(0.00000001)
                                            ->minValue(-90)
                                            ->maxValue(90)
                                            ->placeholder('e.g., 47.6062')
                                            ->helperText('Latitude coordinate (-90 to 90)'),
                                        Forms\Components\TextInput::make('longitude')
                                            ->label('Longitude')
                                            ->numeric()
                                            ->step(0.00000001)
                                            ->minValue(-180)
                                            ->maxValue(180)
                                            ->placeholder('e.g., -122.3321')
                                            ->helperText('Longitude coordinate (-180 to 180)'),
                                        Forms\Components\Actions::make([
                                            Forms\Components\Actions\Action::make('geocode')
                                                ->label('Geocode from Address')
                                                ->icon('heroicon-o-map-pin')
                                                ->color('primary')
                                                ->action(function (Forms\Get $get, Forms\Set $set) {
                                                    $address = $get('address');
                                                    if (empty($address)) {
                                                        \Filament\Notifications\Notification::make()
                                                            ->title('Address Required')
                                                            ->body('Please enter an address before geocoding.')
                                                            ->warning()
                                                            ->send();

                                                        return;
                                                    }

                                                    try {
                                                        $locationService = app(LocationService::class);
                                                        $coordinates = $locationService->geocodeAddress($address);

                                                        if ($coordinates) {
                                                            $set('latitude', $coordinates['latitude']);
                                                            $set('longitude', $coordinates['longitude']);
                                                            \Filament\Notifications\Notification::make()
                                                                ->title('Geocoding Successful')
                                                                ->body('Coordinates have been populated from the address.')
                                                                ->success()
                                                                ->send();
                                                        } else {
                                                            \Filament\Notifications\Notification::make()
                                                                ->title('Geocoding Failed')
                                                                ->body('Unable to geocode the address. Please enter coordinates manually.')
                                                                ->warning()
                                                                ->send();
                                                        }
                                                    } catch (\Exception $e) {
                                                        Log::error('Geocoding error in FacilityResource', [
                                                            'error' => $e->getMessage(),
                                                            'address' => $address,
                                                        ]);
                                                        \Filament\Notifications\Notification::make()
                                                            ->title('Geocoding Error')
                                                            ->body('An error occurred while geocoding. Please try again or enter coordinates manually.')
                                                            ->danger()
                                                            ->send();
                                                    }
                                                }),
                                        ]),
                                    ])
                                    ->columns(2)
                                    ->collapsible(),
                            ]),

                        Forms\Components\Tabs\Tab::make('Branding')
                            ->icon('heroicon-o-paint-brush')
                            ->visible(fn () => auth()->user()->role === 'super_admin')
                            ->schema([
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
                                    ->columns(2),
                            ]),

                        Forms\Components\Tabs\Tab::make('Module Access')
                            ->icon('heroicon-o-cog-6-tooth')
                            ->visible(fn () => auth()->user()->role === 'super_admin')
                            ->schema([
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
                                                if (! $record) {
                                                    return array_keys(\App\Constants\Modules::all());
                                                }

                                                return $record->modules()
                                                    ->where('is_enabled', true)
                                                    ->pluck('module')
                                                    ->toArray();
                                            })
                                            ->dehydrated(true),
                                    ])
                                    ->collapsible(),
                            ]),

                        Forms\Components\Tabs\Tab::make('Fax')
                            ->icon('heroicon-o-paper-airplane')
                            ->visible(fn () => auth()->user()->role === 'super_admin')
                            ->schema(static::faxTabSchema()),

                        Forms\Components\Tabs\Tab::make('Owner Account')
                            ->icon('heroicon-o-user')
                            ->visible(fn () => auth()->user()->role === 'super_admin')
                            ->schema([
                                Forms\Components\Section::make('Facility Owner Account')
                                    ->description('Manage the facility owner account. This is the primary administrator account for this facility.')
                                    ->schema([
                                        Forms\Components\Placeholder::make('current_owner')
                                            ->label('Current Owner')
                                            ->content(function ($record) {
                                                if (! $record) {
                                                    return 'No owner account set. Create one below.';
                                                }

                                                $owner = $record->owner;
                                                if (! $owner) {
                                                    return 'No owner account set. Create one below.';
                                                }

                                                return "**{$owner->name}** ({$owner->email}) - {$owner->role}";
                                            })
                                            ->visible(fn ($record) => $record && $record->owner),

                                        Forms\Components\TextInput::make('owner_name')
                                            ->label('Owner Name')
                                            ->maxLength(255)
                                            ->placeholder('Enter owner full name')
                                            ->helperText('Full name of the facility owner/administrator')
                                            ->visible(fn ($record) => ! $record || ! $record->owner),

                                        Forms\Components\TextInput::make('owner_email')
                                            ->label('Owner Email')
                                            ->email()
                                            ->maxLength(255)
                                            ->placeholder('owner@example.com')
                                            ->helperText('Email address for the owner account (used for login)')
                                            ->unique(\App\Models\User::class, 'email', ignoreRecord: function ($record) {
                                                // If editing and facility has owner, ignore owner's email
                                                if ($record && $record->owner) {
                                                    return $record->owner;
                                                }

                                                return null;
                                            })
                                            ->visible(fn ($record) => ! $record || ! $record->owner),

                                        Forms\Components\Select::make('owner_role')
                                            ->label('Owner Role')
                                            ->options([
                                                'administrator' => 'Administrator',
                                                'admin' => 'Admin',
                                                'manager' => 'Manager',
                                            ])
                                            ->default('administrator')
                                            ->required()
                                            ->helperText('Role assigned to the owner account')
                                            ->visible(fn ($record) => ! $record || ! $record->owner),

                                        Forms\Components\TextInput::make('owner_password')
                                            ->label('Owner Password')
                                            ->password()
                                            ->revealable()
                                            ->minLength(8)
                                            ->helperText('Password for the owner account (minimum 8 characters). Leave blank when editing to keep current password.')
                                            ->visible(fn ($record) => ! $record || ! $record->owner),

                                        Forms\Components\Placeholder::make('owner_info')
                                            ->label('Note')
                                            ->content('To update an existing owner account, use the "Accounts" tab or edit the user directly.')
                                            ->visible(fn ($record) => $record && $record->owner),
                                    ])
                                    ->columns(2),
                            ]),
                    ]),
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
            RelationManagers\UsersRelationManager::class,
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

    /**
     * Filament v3 schema for the "Fax" tab. Pulled out so the
     * EditFacility/CreateFacility pages can also import it for fillForm /
     * afterSave plumbing if they need to.
     *
     * The Facility model intentionally has NO `faxSetting()` relation
     * (data layer owned by sibling agent), so we look the row up by
     * `facility_id` with `withoutGlobalScopes()` to bypass FacilityScope
     * when running under a super admin who is not bound to one tenant.
     *
     * Form fields use a `fax_*` prefix so they don't collide with
     * Facility's own columns (notably `is_active`). The Edit/Create page
     * classes strip them out of `$data` before persist and re-hydrate
     * the FaxSetting row from the form state in their afterSave/afterCreate
     * hooks.
     *
     * @return array<int, \Filament\Forms\Components\Component>
     */
    public static function faxTabSchema(): array
    {
        $registry = app(ProviderRegistry::class);
        $providers = $registry->all();

        $providerOptions = collect($providers)
            ->mapWithKeys(fn (string $class, string $key) => [$key => $class::displayName()])
            ->all();

        $credentialGroups = collect($providers)->map(function (string $class, string $key) {
            $fields = collect($class::credentialSchema())
                ->map(function ($field) {
                    $isSecret = $field->type === 'secret';

                    $input = Forms\Components\TextInput::make("fax_credentials.{$field->name}")
                        ->label($field->label)
                        ->helperText($field->help)
                        ->placeholder($field->placeholder ?? '')
                        ->maxLength(2048)
                        // Secret fields stay required only when the facility
                        // hasn't already saved credentials — otherwise an
                        // operator editing other settings is forced to
                        // re-enter a 64-char API key every time.
                        ->required(fn (Get $get): bool => $field->required
                            && ! ($isSecret && $get('fax_credentials_preconfigured')));

                    if ($isSecret) {
                        $input
                            ->password()
                            ->revealable()
                            ->placeholder(fn (Get $get): string => $get('fax_credentials_preconfigured')
                                ? '●●●●●●● (already configured)'
                                : ($field->placeholder ?? ''))
                            // Skip empty secrets so afterSave's array_merge
                            // keeps the previously saved value intact.
                            ->dehydrated(fn ($state): bool => filled($state));
                    }

                    return $input;
                })
                ->all();

            return Forms\Components\Group::make($fields)
                ->columns(2)
                ->visible(fn (Get $get): bool => $get('fax_provider') === $key);
        })->values()->all();

        return [
            Forms\Components\Section::make('Provider')
                ->description('Each facility independently chooses its fax provider. Credentials are stored encrypted on the fax_settings row, never in .env.')
                ->schema(array_merge([
                    Forms\Components\Select::make('fax_provider')
                        ->label('Fax Provider')
                        ->options($providerOptions)
                        ->placeholder('Select a provider')
                        ->live()
                        ->native(false)
                        ->columnSpanFull(),

                    Forms\Components\Hidden::make('fax_credentials_preconfigured')
                        ->default(false)
                        ->dehydrated(false),
                ], $credentialGroups))
                ->columns(2),

            Forms\Components\Section::make('Defaults')
                ->schema([
                    Forms\Components\TextInput::make('fax_cost_per_page_cents')
                        ->label('Cost per page')
                        ->numeric()
                        ->minValue(0)
                        ->suffix('cents')
                        ->default((int) config('fax.defaults.cost_per_page_cents', 7)),

                    Forms\Components\TextInput::make('fax_max_file_mb')
                        ->label('Max upload size')
                        ->numeric()
                        ->minValue(1)
                        ->maxValue(100)
                        ->suffix('MB')
                        ->default((int) config('fax.defaults.max_file_mb', 25)),

                    Forms\Components\TextInput::make('fax_retention_days')
                        ->label('Retention')
                        ->numeric()
                        ->minValue(1)
                        ->suffix('days')
                        ->helperText('Default ~7 years for HIPAA.')
                        ->default((int) config('fax.defaults.retention_days', 2555)),

                    Forms\Components\Toggle::make('fax_is_active')
                        ->label('Fax module active for this facility')
                        ->default(true)
                        ->inline(false),
                ])
                ->columns(2),

            Forms\Components\Section::make('Webhook')
                ->description('Paste this URL into the provider dashboard so inbound faxes and status events route back to the facility.')
                ->schema([
                    Forms\Components\Placeholder::make('webhook_url')
                        ->label('Inbound webhook URL')
                        ->content(function (Get $get, ?Facility $record): string {
                            if (! $record) {
                                return 'Webhook URL will be generated after first save.';
                            }

                            $setting = FaxSetting::withoutGlobalScopes()
                                ->where('facility_id', $record->id)
                                ->first();

                            if (! $setting) {
                                return 'Webhook URL will be generated after first save.';
                            }

                            $provider = $get('fax_provider') ?: $setting->provider ?: '{provider}';

                            return url('/api/v1/webhooks/fax/'.$provider.'/'.$setting->webhook_secret);
                        })
                        ->columnSpanFull(),

                    Forms\Components\Actions::make([
                        Forms\Components\Actions\Action::make('test_connection')
                            ->label('Test connection')
                            ->icon('heroicon-o-signal')
                            ->color('primary')
                            ->action(function (Get $get): void {
                                $provider = $get('fax_provider');
                                if (! $provider) {
                                    Notification::make()
                                        ->title('Select a provider first')
                                        ->warning()
                                        ->send();

                                    return;
                                }

                                $credentials = (array) ($get('fax_credentials') ?? []);
                                $credentials = array_filter(
                                    $credentials,
                                    fn ($v): bool => $v !== null && $v !== ''
                                );

                                try {
                                    $result = app(FaxManager::class)
                                        ->testCredentials($provider, $credentials);
                                } catch (\Throwable $e) {
                                    Log::error('Fax test connection failed', [
                                        'error' => $e->getMessage(),
                                        'provider' => $provider,
                                    ]);

                                    Notification::make()
                                        ->title('Test failed')
                                        ->body($e->getMessage())
                                        ->danger()
                                        ->send();

                                    return;
                                }

                                $notification = Notification::make()->title($result->message);
                                $result->ok ? $notification->success() : $notification->danger();
                                $notification->send();
                            }),

                        Forms\Components\Actions\Action::make('rotate_webhook_secret')
                            ->label('Rotate webhook secret')
                            ->icon('heroicon-o-arrow-path')
                            ->color('warning')
                            ->requiresConfirmation()
                            ->modalHeading('Rotate webhook secret?')
                            ->modalDescription('After rotation the old URL will start rejecting webhooks. Update your provider dashboard with the new URL immediately.')
                            ->modalSubmitActionLabel('Rotate')
                            ->action(function (?Facility $record): void {
                                if (! $record) {
                                    Notification::make()
                                        ->title('Save the facility first')
                                        ->warning()
                                        ->send();

                                    return;
                                }

                                $setting = FaxSetting::withoutGlobalScopes()
                                    ->where('facility_id', $record->id)
                                    ->first();

                                if (! $setting) {
                                    Notification::make()
                                        ->title('No fax settings yet')
                                        ->body('Save the Fax tab once first so a webhook secret is issued.')
                                        ->warning()
                                        ->send();

                                    return;
                                }

                                $newSecret = $setting->rotateWebhookSecret();
                                $newUrl = url('/api/v1/webhooks/fax/'.$setting->provider.'/'.$newSecret);

                                Notification::make()
                                    ->title('Webhook secret rotated')
                                    ->body('New URL: '.$newUrl)
                                    ->success()
                                    ->persistent()
                                    ->send();
                            }),
                    ]),
                ])
                ->columns(1),
        ];
    }

    /**
     * Merge an existing FaxSetting row into the form's data array so the
     * Fax tab populates correctly. Called from EditFacility::mutateFormDataBeforeFill.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function hydrateFaxFormData(array $data, ?Facility $facility): array
    {
        if (! $facility) {
            return $data;
        }

        $setting = FaxSetting::withoutGlobalScopes()
            ->where('facility_id', $facility->id)
            ->first();

        if (! $setting) {
            return $data;
        }

        $data['fax_provider'] = $setting->provider;
        $data['fax_credentials'] = []; // never echo saved secrets back to the browser
        $data['fax_credentials_preconfigured'] = ! empty($setting->credentials);
        $data['fax_cost_per_page_cents'] = $setting->cost_per_page_cents;
        $data['fax_max_file_mb'] = $setting->max_file_mb;
        $data['fax_retention_days'] = $setting->retention_days;
        $data['fax_is_active'] = (bool) $setting->is_active;

        return $data;
    }

    /**
     * Persist the Fax tab's form state onto the facility's FaxSetting row.
     * Called from EditFacility::afterSave and CreateFacility::afterCreate.
     *
     * @param  array<string, mixed>  $formData
     */
    public static function persistFaxFormData(Facility $facility, array $formData): void
    {
        // No fax fields submitted (e.g. non-super_admin user whose tab is
        // hidden) — leave the row alone.
        $hasFaxState = array_key_exists('fax_provider', $formData)
            || array_key_exists('fax_credentials', $formData)
            || array_key_exists('fax_cost_per_page_cents', $formData)
            || array_key_exists('fax_max_file_mb', $formData)
            || array_key_exists('fax_retention_days', $formData)
            || array_key_exists('fax_is_active', $formData);

        if (! $hasFaxState) {
            return;
        }

        $existing = FaxSetting::withoutGlobalScopes()
            ->where('facility_id', $facility->id)
            ->first();

        $oldCredentials = $existing?->credentials ?? [];
        $newCredentials = (array) ($formData['fax_credentials'] ?? []);

        // Skip blank values so we never overwrite a stored secret with "".
        $mergedCredentials = array_filter(
            array_merge($oldCredentials, $newCredentials),
            fn ($v): bool => $v !== null && $v !== ''
        );

        FaxSetting::withoutGlobalScopes()->updateOrCreate(
            ['facility_id' => $facility->id],
            [
                'provider' => $formData['fax_provider'] ?? $existing?->provider,
                'credentials' => $mergedCredentials,
                'cost_per_page_cents' => (int) ($formData['fax_cost_per_page_cents']
                    ?? config('fax.defaults.cost_per_page_cents', 7)),
                'max_file_mb' => (int) ($formData['fax_max_file_mb']
                    ?? config('fax.defaults.max_file_mb', 25)),
                'retention_days' => (int) ($formData['fax_retention_days']
                    ?? config('fax.defaults.retention_days', 2555)),
                'is_active' => (bool) ($formData['fax_is_active'] ?? true),
                'updated_by' => auth()->id(),
                'created_by' => $existing?->created_by ?? auth()->id(),
            ],
        );
    }
}
