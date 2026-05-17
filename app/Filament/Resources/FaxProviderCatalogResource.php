<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FaxProviderCatalogResource\Pages;
use App\Models\FaxProviderCatalog;
use App\Services\Fax\ProviderRegistry;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Validation\Rule;

class FaxProviderCatalogResource extends Resource
{
    protected static ?string $model = FaxProviderCatalog::class;

    protected static ?string $navigationIcon = 'heroicon-o-squares-plus';

    protected static ?string $navigationLabel = 'Fax provider catalog';

    protected static ?string $modelLabel = 'Fax provider option';

    protected static ?string $pluralModelLabel = 'Fax provider catalog';

    protected static ?string $navigationGroup = 'Operations';

    protected static ?int $navigationSort = 60;

    public static function shouldRegisterNavigation(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
    }

    public static function canViewAny(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
    }

    public static function canCreate(): bool
    {
        return static::canViewAny();
    }

    public static function canEdit($record): bool
    {
        return static::canViewAny();
    }

    public static function canDelete($record): bool
    {
        return static::canViewAny();
    }

    public static function form(Form $form): Form
    {
        $canonicalOptions = collect(app(ProviderRegistry::class)->all())
            ->mapWithKeys(fn (string $class, string $key) => [$key => $class::displayName().' ('.$key.')'])
            ->all();

        $reservedSlugs = array_keys(app(ProviderRegistry::class)->all());

        return $form
            ->schema([
                Forms\Components\Section::make('Dropdown option')
                    ->description('Adds an extra entry to the Fax Settings provider list in the app. It must map to a built-in driver (same API & credentials as Telnyx, Documo, or Fake). New carrier integrations still require a PHP provider class in the codebase.')
                    ->schema([
                        Forms\Components\TextInput::make('slug')
                            ->label('Key (slug)')
                            ->required()
                            ->maxLength(64)
                            ->alphaDash()
                            ->unique(ignoreRecord: true)
                            ->helperText('Lowercase letters, numbers, underscore or hyphen. Shown as the internal value in the API (e.g. regional_telnyx).')
                            ->rules([
                                Rule::notIn($reservedSlugs),
                            ]),
                        Forms\Components\Select::make('canonical_provider')
                            ->label('Maps to driver')
                            ->options($canonicalOptions)
                            ->required()
                            ->native(false)
                            ->helperText('Which installed integration handles send/receive and webhooks.'),
                        Forms\Components\TextInput::make('display_name')
                            ->label('Label in dropdown')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->rows(2)
                            ->maxLength(2000)
                            ->columnSpanFull(),
                        Forms\Components\TextInput::make('sort_order')
                            ->label('Sort order')
                            ->numeric()
                            ->default(0)
                            ->helperText('Lower numbers appear first (before built-in providers in the list).'),
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
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('slug')
                    ->label('Key')
                    ->searchable()
                    ->sortable()
                    ->copyable(),
                Tables\Columns\TextColumn::make('display_name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('canonical_provider')
                    ->label('Driver')
                    ->badge()
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('sort_order')
                    ->sortable(),
            ])
            ->defaultSort('sort_order')
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFaxProviderCatalogs::route('/'),
            'create' => Pages\CreateFaxProviderCatalog::route('/create'),
            'edit' => Pages\EditFaxProviderCatalog::route('/{record}/edit'),
        ];
    }
}
