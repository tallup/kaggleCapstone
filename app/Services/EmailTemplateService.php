<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\Facility;
use Illuminate\Support\Facades\View;

class EmailTemplateService
{
    /**
     * Render email subject from template
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @param array $variables
     * @param string $defaultSubject
     * @return string
     */
    public function renderSubject(
        Facility $facility,
        string $notificationType,
        array $variables = [],
        string $defaultSubject = ''
    ): string {
        $template = EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->active()
            ->first();

        if (!$template || empty($template->subject_template)) {
            return $defaultSubject;
        }

        return $this->replaceVariables($template->subject_template, $variables);
    }

    /**
     * Render email HTML content from template
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @param array $variables
     * @param string $defaultBladeView
     * @param array $defaultBladeData
     * @return string
     */
    public function renderHtml(
        Facility $facility,
        string $notificationType,
        array $variables = [],
        string $defaultBladeView = '',
        array $defaultBladeData = []
    ): string {
        $template = EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->active()
            ->first();

        // If custom template exists and is active, use it
        if ($template && !empty($template->html_template)) {
            return $this->replaceVariables($template->html_template, $variables);
        }

        // Fallback to default blade template
        if (!empty($defaultBladeView) && View::exists($defaultBladeView)) {
            return View::make($defaultBladeView, $defaultBladeData)->render();
        }

        // Last resort: return empty string or a simple message
        return '<p>Email notification</p>';
    }

    /**
     * Check if a custom template exists for a facility and notification type
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @return bool
     */
    public function hasCustomTemplate(Facility $facility, string $notificationType): bool
    {
        return EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->active()
            ->exists();
    }

    /**
     * Get template for a facility and notification type
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @return EmailTemplate|null
     */
    public function getTemplate(Facility $facility, string $notificationType): ?EmailTemplate
    {
        return EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();
    }

    /**
     * Replace variables in template string
     * 
     * @param string $template
     * @param array $variables
     * @return string
     */
    protected function replaceVariables(string $template, array $variables): string
    {
        $result = $template;

        foreach ($variables as $key => $value) {
            // Replace {{variableName}} format
            $result = str_replace('{{' . $key . '}}', $value ?? '', $result);
            // Also support {variableName} format
            $result = str_replace('{' . $key . '}', $value ?? '', $result);
        }

        return $result;
    }

    /**
     * Get all templates for a facility
     * 
     * @param Facility $facility
     * @return \Illuminate\Support\Collection
     */
    public function getTemplatesForFacility(Facility $facility)
    {
        return EmailTemplate::forFacility($facility->id)->get();
    }

    /**
     * Preview template with sample data
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @param array $sampleVariables
     * @return array ['subject' => string, 'html' => string]
     */
    public function previewTemplate(
        Facility $facility,
        string $notificationType,
        array $sampleVariables = []
    ): array {
        $template = EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();

        if (!$template) {
            return [
                'subject' => '',
                'html' => '<p>No template found</p>',
            ];
        }

        return [
            'subject' => $this->replaceVariables($template->subject_template ?? '', $sampleVariables),
            'html' => $this->replaceVariables($template->html_template ?? '', $sampleVariables),
        ];
    }
}

