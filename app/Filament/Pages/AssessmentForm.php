<?php

namespace App\Filament\Pages;

use App\Models\Assessment;
use App\Models\AssessmentSection;
use App\Models\AssessmentQuestion;
use Filament\Pages\Page;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Actions;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AssessmentForm extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-check';
    protected static ?string $navigationLabel = 'Complete Assessment';
    protected static ?string $title = 'Complete Assessment';
    protected static ?string $navigationGroup = null;
    protected static bool $shouldRegisterNavigation = false;

    public static function canAccess(): bool
    {
        return auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin');
    }
    protected static string $view = 'filament.pages.assessment-form';

    public ?Assessment $assessment = null;
    public ?array $data = [];

    public function mount(): void
    {
        $assessmentId = request()->query('assessment');
        
        if ($assessmentId) {
            $this->assessment = Assessment::with(['resident', 'branch', 'assessor', 'sections.questions'])->findOrFail($assessmentId);
            
            // If assessment has no sections, create them
            if ($this->assessment->sections()->count() === 0) {
                $this->createAssessmentSections();
                // Reload assessment with sections and questions
                $this->assessment->load(['sections.questions']);
            }
            
            $this->data = $this->assessment->toArray();
            
            // Pre-fill medical history information from resident data
            $this->prefillMedicalHistoryData();
            
            // Fill the form with the pre-filled data
            $this->form->fill($this->data);
        }
    }

    protected function prefillDemographicData(): void
    {
        if (!$this->assessment || !$this->assessment->resident) {
            return;
        }

        $resident = $this->assessment->resident;
        
        // Find the demographic section
        $demographicSection = $this->assessment->sections()
            ->where('section_type', 'demographic')
            ->with('questions')
            ->first();

        if (!$demographicSection) {
            return;
        }

        // Pre-fill demographic questions based on resident data
        foreach ($demographicSection->questions as $question) {
            // Map questions to resident data
            $value = match (strtolower($question->question_text)) {
                'what is the resident\'s full name?' => $resident->name,
                'date of birth?' => $resident->date_of_birth?->format('Y-m-d'),
                'emergency contact name' => $resident->emergency_contact_name,
                'emergency contact phone' => $resident->emergency_contact_phone,
                default => null,
            };

            if ($value !== null) {
                // Set the value using the exact form field name format
                $fieldName = "sections.{$demographicSection->id}.questions.{$question->id}";
                $this->data[$fieldName] = $value;
            }
        }
    }

    protected function prefillMedicalHistoryData(): void
    {
        if (!$this->assessment || !$this->assessment->resident) {
            return;
        }

        $resident = $this->assessment->resident;
        
        // Find the medical history section
        $medicalSection = $this->assessment->sections()
            ->where('section_type', 'medical_history')
            ->with('questions')
            ->first();

        if (!$medicalSection) {
            return;
        }

        // Pre-fill medical history questions based on resident data
        foreach ($medicalSection->questions as $question) {
            // Map questions to resident data
            $value = match (strtolower($question->question_text)) {
                'primary diagnosis' => $resident->diagnosis,
                'known allergies' => $resident->allergies,
                'physician name' => $resident->physician_name,
                'physician phone' => $resident->pep_or_doctor,
                default => null,
            };

            if ($value !== null) {
                // Set the value using the exact form field name format
                $fieldName = "sections.{$medicalSection->id}.questions.{$question->id}";
                $this->data[$fieldName] = $value;
            }
        }
    }

    public function form(Form $form): Form
    {
        if (!$this->assessment) {
            return $form->schema([]);
        }

        // Reload sections with questions to ensure we have the latest data
        $sections = $this->assessment->sections()->with('questions')->get();
        
        // If still no sections, try to create them
        if ($sections->isEmpty()) {
            $this->createAssessmentSections();
            $sections = $this->assessment->sections()->with('questions')->get();
        }
        
        $schema = [];

        foreach ($sections as $section) {
            // Skip demographic section since that info is already available
            if ($section->section_type === 'demographic') {
                continue;
            }
            
            $sectionSchema = [];
            
            // If section has no questions, skip it
            if ($section->questions->isEmpty()) {
                continue;
            }
            
            foreach ($section->questions as $question) {
                $field = match ($question->response_type) {
                    'text' => Forms\Components\TextInput::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text),
                    'number' => Forms\Components\TextInput::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text)
                        ->numeric(),
                    'select' => Forms\Components\Select::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text)
                        ->options(is_array($question->response_options) ? $question->response_options : (is_string($question->response_options) ? json_decode($question->response_options, true) : [])),
                    'radio' => Forms\Components\Radio::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text)
                        ->options(is_array($question->response_options) ? $question->response_options : (is_string($question->response_options) ? json_decode($question->response_options, true) : [])),
                    'checkbox' => Forms\Components\CheckboxList::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text)
                        ->options(is_array($question->response_options) ? $question->response_options : (is_string($question->response_options) ? json_decode($question->response_options, true) : [])),
                    'date' => Forms\Components\DatePicker::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text),
                    default => Forms\Components\TextInput::make("sections.{$section->id}.questions.{$question->id}")
                        ->label($question->question_text),
                };

                $sectionSchema[] = $field;
            }
            
            // Only add section if it has fields
            if (!empty($sectionSchema)) {
                $schema[] = Forms\Components\Section::make($section->section_title)
                    ->description($section->notes ?? '')
                    ->schema($sectionSchema)
                    ->collapsible();
            }
        }

        return $form
            ->schema($schema)
            ->statePath('data');
    }
    
    protected function createAssessmentSections(): void
    {
        if (!$this->assessment) {
            return;
        }

        // Use the same section creation logic from AssessmentPage
        $sections = [
            'demographic' => [
                'title' => 'Demographic Information',
                'questions' => [
                    ['text' => 'What is the resident\'s full name?', 'type' => 'text'],
                    ['text' => 'Date of birth?', 'type' => 'date'],
                    ['text' => 'Gender', 'type' => 'radio', 'options' => ['Male', 'Female', 'Other']],
                    ['text' => 'Marital status', 'type' => 'select', 'options' => ['Single', 'Married', 'Divorced', 'Widowed']],
                    ['text' => 'Emergency contact name', 'type' => 'text'],
                    ['text' => 'Emergency contact phone', 'type' => 'text'],
                ]
            ],
            'medical_history' => [
                'title' => 'Medical History',
                'questions' => [
                    ['text' => 'Primary diagnosis', 'type' => 'text'],
                    ['text' => 'Secondary diagnoses', 'type' => 'text'],
                    ['text' => 'Current medications', 'type' => 'text'],
                    ['text' => 'Known allergies', 'type' => 'text'],
                    ['text' => 'Physician name', 'type' => 'text'],
                    ['text' => 'Physician phone', 'type' => 'text'],
                    ['text' => 'Last physical exam date', 'type' => 'date'],
                ]
            ],
            'functional' => [
                'title' => 'Functional Assessment',
                'questions' => [
                    ['text' => 'Can the resident walk independently?', 'type' => 'radio', 'options' => ['Yes', 'No', 'With assistance']],
                    ['text' => 'Can the resident feed themselves?', 'type' => 'radio', 'options' => ['Yes', 'No', 'With assistance']],
                    ['text' => 'Can the resident bathe independently?', 'type' => 'radio', 'options' => ['Yes', 'No', 'With assistance']],
                    ['text' => 'Can the resident dress independently?', 'type' => 'radio', 'options' => ['Yes', 'No', 'With assistance']],
                    ['text' => 'Can the resident use the toilet independently?', 'type' => 'radio', 'options' => ['Yes', 'No', 'With assistance']],
                ]
            ],
            'cognitive' => [
                'title' => 'Cognitive Assessment',
                'questions' => [
                    ['text' => 'Is the resident oriented to person?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Is the resident oriented to place?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Is the resident oriented to time?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Any signs of confusion?', 'type' => 'radio', 'options' => ['Yes', 'No', 'Occasionally']],
                    ['text' => 'Memory concerns?', 'type' => 'text'],
                ]
            ],
            'behavioral' => [
                'title' => 'Behavioral Assessment',
                'questions' => [
                    ['text' => 'Any aggressive behaviors?', 'type' => 'radio', 'options' => ['Yes', 'No', 'Occasionally']],
                    ['text' => 'Any wandering behaviors?', 'type' => 'radio', 'options' => ['Yes', 'No', 'Occasionally']],
                    ['text' => 'Any signs of depression?', 'type' => 'radio', 'options' => ['Yes', 'No', 'Occasionally']],
                    ['text' => 'Sleep patterns?', 'type' => 'text'],
                    ['text' => 'Social interaction level?', 'type' => 'select', 'options' => ['Very Social', 'Moderate', 'Minimal', 'Isolated']],
                ]
            ],
            'nutritional' => [
                'title' => 'Nutritional Assessment',
                'questions' => [
                    ['text' => 'Current weight', 'type' => 'number'],
                    ['text' => 'Appetite level', 'type' => 'select', 'options' => ['Excellent', 'Good', 'Fair', 'Poor']],
                    ['text' => 'Any dietary restrictions?', 'type' => 'text'],
                    ['text' => 'Any swallowing difficulties?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Fluid intake adequate?', 'type' => 'radio', 'options' => ['Yes', 'No', 'Unknown']],
                ]
            ],
            'environmental' => [
                'title' => 'Environmental Assessment',
                'questions' => [
                    ['text' => 'Room cleanliness', 'type' => 'select', 'options' => ['Excellent', 'Good', 'Fair', 'Poor']],
                    ['text' => 'Safety concerns?', 'type' => 'text'],
                    ['text' => 'Any fall risks?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Adequate lighting?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                ]
            ],
            'risk' => [
                'title' => 'Risk Assessment',
                'questions' => [
                    ['text' => 'Fall risk level', 'type' => 'select', 'options' => ['Low', 'Moderate', 'High', 'Very High']],
                    ['text' => 'Skin integrity concerns?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Any pressure ulcers?', 'type' => 'radio', 'options' => ['Yes', 'No']],
                    ['text' => 'Medication compliance?', 'type' => 'select', 'options' => ['Excellent', 'Good', 'Fair', 'Poor']],
                    ['text' => 'Overall risk level', 'type' => 'select', 'options' => ['Low', 'Moderate', 'High']],
                ]
            ],
        ];

        foreach ($sections as $type => $sectionData) {
            $section = $this->assessment->sections()->create([
                'section_type' => $type,
                'is_completed' => false,
            ]);

            // Create questions for this section
            foreach ($sectionData['questions'] as $questionData) {
                $section->questions()->create([
                    'question_text' => $questionData['text'],
                    'response_type' => $questionData['type'],
                    'response_options' => isset($questionData['options']) ? json_encode($questionData['options']) : null,
                    'response_value' => null,
                    'weight' => 1,
                ]);
            }
        }
    }

    public function saveAction(): Action
    {
        return Action::make('save')
            ->label('Save Progress')
            ->color('primary')
            ->action(function () {
                $this->saveAssessment();
                
                Notification::make()
                    ->title('Assessment Saved')
                    ->body('Your progress has been saved.')
                    ->success()
                    ->send();
            });
    }

    public function submitAction(): Action
    {
        return Action::make('submit')
            ->label('Submit Assessment')
            ->color('success')
            ->action(function () {
                $this->saveAssessment();
                
                $this->assessment->update([
                    'status' => 'submitted',
                    'completed_at' => now(),
                ]);

                Notification::make()
                    ->title('Assessment Submitted')
                    ->body('Assessment has been submitted for review.')
                    ->success()
                    ->send();

                $this->redirect('/admin/assessments');
            });
    }

    protected function saveAssessment(): void
    {
        if (!$this->assessment) {
            return;
        }

        // Debug: Log the data structure
        \Log::info('Assessment data structure:', $this->data);

        // Process form data - handle both patterns
        $sections = [];
        
        // Handle sections.{sectionId}.questions.{questionId} pattern
        foreach ($this->data as $key => $value) {
            if (str_starts_with($key, 'sections.') && str_contains($key, '.questions.')) {
                $parts = explode('.', $key);
                if (count($parts) === 4 && $parts[0] === 'sections' && $parts[2] === 'questions') {
                    $sectionId = $parts[1];
                    $questionId = $parts[3];
                    
                    if (!isset($sections[$sectionId])) {
                        $sections[$sectionId] = [];
                    }
                    $sections[$sectionId][$questionId] = $value;
                }
            }
        }
        
        // Handle sections.{sectionId}.questions.{questionId} nested structure
        if (isset($this->data['sections']) && is_array($this->data['sections'])) {
            foreach ($this->data['sections'] as $sectionId => $sectionData) {
                if (isset($sectionData['questions']) && is_array($sectionData['questions'])) {
                    foreach ($sectionData['questions'] as $questionId => $value) {
                        if (!isset($sections[$sectionId])) {
                            $sections[$sectionId] = [];
                        }
                        $sections[$sectionId][$questionId] = $value;
                    }
                }
            }
        }
        
        foreach ($sections as $sectionId => $questions) {
            $section = AssessmentSection::find($sectionId);
            if (!$section) continue;

            $completedQuestions = 0;
            $totalQuestions = $section->questions()->count();

            foreach ($questions as $questionId => $response) {
                $question = AssessmentQuestion::find($questionId);
                if (!$question) continue;

                // Only update if there's a response
                if (!empty($response)) {
                    $question->update([
                        'response_value' => is_array($response) ? json_encode($response) : $response,
                    ]);
                    $completedQuestions++;
                }
            }

            $section->update([
                'is_completed' => $completedQuestions === $totalQuestions,
                'completed_at' => $completedQuestions === $totalQuestions ? now() : null,
            ]);
        }

        // Update assessment completion percentage
        $totalQuestions = $this->assessment->sections()->withCount('questions')->get()->sum('questions_count');
        $answeredQuestions = $this->assessment->sections()
            ->with('questions')
            ->get()
            ->flatMap(fn($section) => $section->questions)
            ->whereNotNull('response_value')
            ->where('response_value', '!=', '')
            ->count();

        $completionPercentage = $totalQuestions > 0 ? round(($answeredQuestions / $totalQuestions) * 100) : 0;

        $this->assessment->update([
            'completion_percentage' => $completionPercentage,
        ]);
    }

    public function getAssessment(): ?Assessment
    {
        return $this->assessment;
    }

    public function getCompletionPercentage(): int
    {
        if (!$this->assessment) {
            return 0;
        }

        return $this->assessment->completion_percentage;
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('back_to_assessments')
                ->label('Back to Assessments')
                ->icon('heroicon-o-arrow-left')
                ->color('gray')
                ->url('/admin/assessments'),
        ];
    }
}
