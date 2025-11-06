<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AssessmentResource\Pages;
use App\Filament\Resources\AssessmentResource\RelationManagers;
use App\Models\Assessment;
use App\Models\Resident;
use App\Models\Branch;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Actions\Action;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Section;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class AssessmentResource extends Resource
{
    protected static ?string $model = Assessment::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationLabel = 'Start Assessment';
    protected static ?string $modelLabel = 'Assessment';
    protected static ?string $pluralModelLabel = 'Assessments';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static bool $shouldRegisterNavigation = false;

    public static function canViewAny(): bool
    {
        return auth()->user()->hasRole('administrator')
            || auth()->user()->hasRole('super_admin')
            || auth()->user()->hasRole('caregiver');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin');
    }

    public static function canEdit($record): bool
    {
        return auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin');
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show assessments for all residents in their branch
        if (auth()->user()->hasRole('caregiver')) {
            $query->whereHas('resident', function ($q) {
                $q->where('branch_id', auth()->user()->assigned_branch_id);
            });
        }
        
        return $query;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Assessment Details')
                    ->schema([
                        Select::make('branch_id')
                            ->label('Branch')
                            ->options(
                                Branch::where('is_active', true)
                                    ->whereNotNull('name')
                                    ->pluck('name', 'id')
                                    ->filter()
                            )
                            ->searchable()
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set) {
                                $set('resident_id', null);
                            }),

                        Select::make('resident_id')
                            ->label('Resident')
                            ->options(function (Forms\Get $get) {
                                $branchId = $get('branch_id');
                                if (!$branchId) {
                                    return [];
                                }
                                return Resident::where('is_active', true)
                                    ->where('branch_id', $branchId)
                                    ->whereNotNull('name')
                                    ->pluck('name', 'id')
                                    ->filter();
                            })
                            ->searchable()
                            ->required()
                            ->disabled(fn (Forms\Get $get) => !$get('branch_id')),

                        Select::make('assessor_id')
                            ->label('Assessor')
                            ->options(
                                User::where('is_active', true)
                                    ->whereNotNull('name')
                                    ->pluck('name', 'id')
                                    ->filter()
                            )
                            ->searchable()
                            ->required(),

                        Select::make('assessment_type')
                            ->label('Assessment Type')
                            ->options([
                                'initial' => 'Initial Assessment',
                                'periodic' => 'Periodic Assessment',
                                'focused' => 'Focused Assessment',
                                'discharge' => 'Discharge Assessment',
                            ])
                            ->required()
                            ->searchable(),

                        DatePicker::make('assessment_date')
                            ->label('Assessment Date')
                            ->native(false)
                            ->required(),

                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'draft' => 'Draft',
                                'submitted' => 'Submitted',
                                'reviewed' => 'Reviewed',
                                'approved' => 'Approved',
                                'archived' => 'Archived',
                            ])
                            ->required(),
                    ])
                    ->columns(2),

                Section::make('Assessment Content')
                    ->schema([
                        Textarea::make('notes')
                            ->label('Assessment Notes')
                            ->rows(4)
                            ->columnSpanFull(),

                        Textarea::make('scores')
                            ->label('Section Scores')
                            ->rows(3)
                            ->columnSpanFull(),

                        Textarea::make('recommendations')
                            ->label('Care Plan Recommendations')
                            ->rows(3)
                            ->columnSpanFull(),
                    ]),

                Section::make('Timeline')
                    ->schema([
                        DatePicker::make('completed_at')
                            ->label('Completed At')
                            ->native(false),

                        DatePicker::make('reviewed_at')
                            ->label('Reviewed At')
                            ->native(false),

                        DatePicker::make('approved_at')
                            ->label('Approved At')
                            ->native(false),
                    ])
                    ->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('branch.name')
                    ->label('Branch')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('assessor.name')
                    ->label('Assessor')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('assessment_type')
                    ->label('Type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'initial' => 'primary',
                        'periodic' => 'success',
                        'focused' => 'warning',
                        'discharge' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'initial' => 'Initial',
                        'periodic' => 'Periodic',
                        'focused' => 'Focused',
                        'discharge' => 'Discharge',
                        default => ucfirst($state),
                    }),

                TextColumn::make('assessment_date')
                    ->label('Assessment Date')
                    ->date('M j, Y')
                    ->sortable(),

                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'draft' => 'gray',
                        'submitted' => 'warning',
                        'reviewed' => 'info',
                        'approved' => 'success',
                        'archived' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => ucfirst($state)),

                TextColumn::make('completion_percentage')
                    ->label('Progress')
                    ->formatStateUsing(fn ($record): string => $record->completion_percentage . '%')
                    ->color(fn ($record): string => match (true) {
                        $record->completion_percentage >= 100 => 'success',
                        $record->completion_percentage >= 75 => 'warning',
                        default => 'danger',
                    }),

                TextColumn::make('completed_at')
                    ->label('Completed')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->placeholder('Not completed'),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'draft' => 'Draft',
                        'submitted' => 'Submitted',
                        'reviewed' => 'Reviewed',
                        'approved' => 'Approved',
                        'archived' => 'Archived',
                    ]),

                SelectFilter::make('assessment_type')
                    ->options([
                        'initial' => 'Initial',
                        'periodic' => 'Periodic',
                        'focused' => 'Focused',
                        'discharge' => 'Discharge',
                    ]),

                SelectFilter::make('branch_id')
                    ->label('Branch')
                    ->relationship('branch', 'name'),

                SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->relationship('resident', 'name')
                    ->searchable()
                    ->preload(),

                TernaryFilter::make('completed_at')
                    ->label('Completed')
                    ->nullable()
                    ->queries(
                        true: fn (Builder $query) => $query->whereNotNull('completed_at'),
                        false: fn (Builder $query) => $query->whereNull('completed_at'),
                        blank: fn (Builder $query) => $query,
                    ),
            ])
            ->actions([
                ViewAction::make()
                    ->label('View')
                    ->color('info'),

                Action::make('complete')
                    ->label('Complete')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (Assessment $record): bool => $record->completion_percentage < 100)
                    ->url(fn (Assessment $record): string => '/admin/assessment-form?assessment=' . $record->id),

                Action::make('submit')
                    ->label('Submit')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('warning')
                    ->visible(fn (Assessment $record): bool => $record->status === 'draft')
                    ->requiresConfirmation()
                    ->modalHeading('Submit Assessment')
                    ->modalDescription('Are you sure you want to submit this assessment? Once submitted, it will be sent for review.')
                    ->modalSubmitActionLabel('Yes, Submit')
                    ->action(function (Assessment $record) {
                        $record->update([
                            'status' => 'submitted',
                            'completed_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Assessment Submitted')
                            ->body('Assessment has been submitted for review.')
                            ->success()
                            ->send();
                    }),

                EditAction::make()
                    ->label('Edit')
                    ->color('primary'),

                DeleteAction::make()
                    ->label('Delete')
                    ->color('danger'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
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
            'index' => Pages\ListAssessments::route('/'),
            'create' => Pages\CreateAssessment::route('/create'),
            'view' => Pages\ViewAssessment::route('/{record}'),
            'edit' => Pages\EditAssessment::route('/{record}/edit'),
        ];
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.assessments-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
