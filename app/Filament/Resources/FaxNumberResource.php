<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FaxNumberResource\Pages;
use App\Models\FaxNumber;
use App\Services\Fax\ProviderRegistry;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class FaxNumberResource extends Resource
{
    protected static ?string $model = FaxNumber::class;

    protected static ?string $navigationIcon = 'heroicon-o-phone';

    protected static ?string $navigationLabel = 'Fax Numbers';

    protected static ?string $modelLabel = 'Fax Number';

    protected static ?string $pluralModelLabel = 'Fax Numbers';

    protected static ?string $navigationGroup = 'Operations';

    protected static ?int $navigationSort = 64;

    public static function shouldRegisterNavigation(): bool
    {
        if (! auth()->check()) {
            return false;
        }

        $user = auth()->user();

        $roleValue = strtolower(trim($user->role ?? ''));
        $roleValueNormalized = str_replace([' ', '_'], '', $roleValue);
        $isCaregiver = $user->hasRole('caregiver')
            || $user->hasRole('care_giver')
            || $roleValueNormalized === 'caregiver'
            || (stripos($roleValue, 'care') !== false && stripos($roleValue, 'giver') !== false);

        if ($isCaregiver) {
            return false;
        }

        return $user->role === 'super_admin' || $user->hasPermission('fax.view');
    }

    public static function canViewAny(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.view'));
    }

    public static function canCreate(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_numbers'));
    }

    public static function canEdit($record): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_numbers'));
    }

    public static function canDelete($record): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_numbers'));
    }

    public static function form(Form $form): Form
    {
        $providerOptions = collect(app(ProviderRegistry::class)->all())
            ->mapWithKeys(fn (string $class, string $key) => [$key => $class::displayName()])
            ->all();

        return $form
            ->schema([
                Forms\Components\Section::make('Number')
                    ->schema([
                        Forms\Components\Select::make('provider')
                            ->label('Provider')
                            ->options($providerOptions)
                            ->required()
                            ->disabled(fn (?FaxNumber $record): bool => $record !== null)
                            ->dehydrated()
                            ->native(false)
                            ->helperText('Cannot be changed after the number is provisioned.'),

                        Forms\Components\TextInput::make('e164_number')
                            ->label('Phone Number (E.164)')
                            ->required()
                            ->maxLength(20)
                            ->regex('/^\+[1-9]\d{1,14}$/')
                            ->helperText('E.164 format, e.g. +14252516337')
                            ->placeholder('+14252516337'),

                        Forms\Components\TextInput::make('friendly_name')
                            ->label('Friendly Name')
                            ->maxLength(255)
                            ->placeholder('e.g. Main reception fax'),

                        Forms\Components\TextInput::make('monthly_cost_cents')
                            ->label('Monthly Cost')
                            ->numeric()
                            ->minValue(0)
                            ->prefix('$0.0')
                            ->helperText('In cents (e.g. 100 = $1.00).'),

                        Forms\Components\DateTimePicker::make('provisioned_at')
                            ->label('Provisioned At')
                            ->native(false)
                            ->displayFormat('M j, Y g:i A')
                            ->seconds(false),

                        Forms\Components\Toggle::make('is_default')
                            ->label('Default for outbound')
                            ->helperText('When on, this becomes the default From number for new outbound faxes. Any other default is cleared.')
                            ->inline(false),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->inline(false),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        $providerOptions = collect(app(ProviderRegistry::class)->all())
            ->mapWithKeys(fn (string $class, string $key) => [$key => $class::displayName()])
            ->all();

        return $table
            ->columns([
                Tables\Columns\TextColumn::make('e164_number')
                    ->label('Number')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Number copied')
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('friendly_name')
                    ->label('Friendly Name')
                    ->searchable()
                    ->placeholder('—'),

                Tables\Columns\TextColumn::make('provider')
                    ->label('Provider')
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (?string $state) => $state
                        ? ($providerOptions[$state] ?? $state)
                        : '—')
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_default')
                    ->label('Default')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-badge')
                    ->trueColor('success')
                    ->falseIcon('heroicon-o-minus-circle')
                    ->falseColor('gray'),

                Tables\Columns\ToggleColumn::make('is_active')
                    ->label('Active'),

                Tables\Columns\TextColumn::make('monthly_cost_cents')
                    ->label('Monthly Cost')
                    ->getStateUsing(fn (FaxNumber $record): string => $record->monthly_cost_cents !== null
                        ? '$'.number_format($record->monthly_cost_cents / 100, 2)
                        : '—')
                    ->sortable(),

                Tables\Columns\TextColumn::make('provisioned_at')
                    ->label('Provisioned')
                    ->dateTime('M j, Y')
                    ->sortable()
                    ->placeholder('—')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('M j, Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('provider')
                    ->label('Provider')
                    ->options($providerOptions),

                TernaryFilter::make('is_default')
                    ->label('Default')
                    ->placeholder('All numbers')
                    ->trueLabel('Default only')
                    ->falseLabel('Non-default'),

                TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All numbers')
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only'),

                TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    Tables\Actions\RestoreBulkAction::make(),
                    Tables\Actions\ForceDeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('e164_number');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFaxNumbers::route('/'),
            'create' => Pages\CreateFaxNumber::route('/create'),
            'edit' => Pages\EditFaxNumber::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
