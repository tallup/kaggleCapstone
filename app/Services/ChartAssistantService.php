<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChartAssistantService
{
    public function analyze(array $payload, ?string $prompt = null): array
    {
        $resolvedPrompt = $prompt ?? 'Summarize the chart trends and recommend next actions.';
        $heuristicResult = $this->buildHeuristicResult($payload, $prompt);

        $apiKey = config('services.anthropic.api_key') ?: env('ANTHROPIC_API_KEY');
        if (empty($apiKey)) {
            return array_merge($heuristicResult, [
                'prompt' => $resolvedPrompt,
                'mode' => 'heuristic',
                'model' => 'heuristic',
            ]);
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-opus-4-8',
                    'max_tokens' => 800,
                    'messages' => [[
                        'role' => 'user',
                        'content' => $this->buildAnthropicPrompt($payload, $prompt),
                    ]],
                ]);

            if ($response->failed()) {
                throw new \RuntimeException(sprintf(
                    'Anthropic request failed (HTTP %d): %s',
                    $response->status(),
                    $response->body()
                ));
            }

            $content = $response->json('content.0.text');
            if (! is_string($content)) {
                throw new \RuntimeException('Anthropic response was empty');
            }

            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $decodedSummary = (string) ($decoded['summary'] ?? $heuristicResult['summary']);

                return array_merge($heuristicResult, [
                    'prompt' => $resolvedPrompt,
                    'mode' => 'anthropic',
                    'model' => 'claude-opus-4-8',
                    'summary' => $decodedSummary,
                    'insights' => $this->normalizeList($decoded['insights'] ?? $heuristicResult['insights']),
                    'recommendations' => $this->normalizeList($decoded['recommendations'] ?? $heuristicResult['recommendations']),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Chart assistant Anthropic fallback triggered', [
                'message' => $e->getMessage(),
            ]);
        }

        return array_merge($heuristicResult, [
            'prompt' => $resolvedPrompt,
            'mode' => 'heuristic',
            'model' => 'heuristic',
        ]);
    }

    public function createConversation(array $context): array
    {
        return [
            'id' => null,
            'resident' => $context['resident']['name'] ?? 'Resident',
            'messages' => [[
                'role' => 'system',
                'content' => 'You are a resident care chart assistant. Be concise and safety-aware.',
            ]],
            'status' => 'active',
        ];
    }

    private function buildAnthropicPrompt(array $payload, ?string $prompt = null): string
    {
        return json_encode([
            'prompt' => $prompt ?? 'Summarize the chart trends and recommend next actions.',
            'resident' => $payload['resident']['name'] ?? 'the selected resident',
            'window' => $payload['window'] ?? 'the selected period',
            'vitals' => $payload['vitals'] ?? [],
            'comparison' => $payload['comparison'] ?? [],
            'facility_follow_up_candidates' => $payload['facility_follow_up_candidates'] ?? [],
            'sleep' => $payload['sleep'] ?? [],
            'behavior_charts' => $payload['behavior_charts'] ?? [],
            'appointments' => $payload['appointments'] ?? [],
            'medications' => $payload['medications'] ?? [],
            'faxes' => $payload['faxes'] ?? [],
            'instructions' => 'Directly answer the "prompt" question first, using the chart data as evidence — do not just restate the raw statistics. If the prompt asks a yes/no or risk-assessment question (e.g. "is the resident in danger"), lead the summary with a clear answer before any supporting detail. Return compact JSON with summary, insights, and recommendations arrays only.',
        ]);
    }

    private function isComparisonPrompt(?string $prompt): bool
    {
        $normalized = strtolower(trim((string) $prompt));

        if ($normalized === '') {
            return false;
        }

        return str_contains($normalized, 'compare')
            || str_contains($normalized, 'prior week')
            || str_contains($normalized, 'previous week')
            || str_contains($normalized, 'what changed')
            || str_contains($normalized, 'week to week')
            || str_contains($normalized, 'versus')
            || str_contains($normalized, 'vs');
    }

    private function isFollowUpMonitorPrompt(?string $prompt): bool
    {
        $normalized = strtolower(trim((string) $prompt));

        if ($normalized === '') {
            return false;
        }

        $mentionsFollowUp = str_contains($normalized, 'follow-up')
            || str_contains($normalized, 'follow up')
            || str_contains($normalized, 'immediate')
            || str_contains($normalized, 'urgent');

        $mentionsMonitor = str_contains($normalized, 'monitor')
            || str_contains($normalized, 'watch')
            || str_contains($normalized, 'observe');

        return $mentionsFollowUp && $mentionsMonitor;
    }

    private function isFollowUpListPrompt(?string $prompt): bool
    {
        $normalized = strtolower(trim((string) $prompt));

        if ($normalized === '') {
            return false;
        }

        $mentionsList = str_contains($normalized, 'list') || str_contains($normalized, 'show') || str_contains($normalized, 'who');
        $mentionsResidents = str_contains($normalized, 'resident') || str_contains($normalized, 'residents');
        $mentionsFollowUp = str_contains($normalized, 'follow-up') || str_contains($normalized, 'follow up');
        $mentionsWhy = str_contains($normalized, 'why') || str_contains($normalized, 'reason');

        return $mentionsFollowUp && ($mentionsList || $mentionsResidents) && $mentionsWhy;
    }

    private function buildFollowUpListSummary(
        string $residentName,
        int $criticalCount,
        int $warningCount,
        int $missedMedicationCount,
        int $providerNotifiedCount,
        int $upcomingAppointments,
        int $behaviorCount,
        int $faxCount
    ): string {
        $reasons = [];

        if ($criticalCount > 0) {
            $reasons[] = "{$criticalCount} critical vital reading(s) require immediate review";
        }
        if ($warningCount > 0) {
            $reasons[] = "{$warningCount} warning vital reading(s) need closer monitoring";
        }
        if ($missedMedicationCount > 0) {
            $reasons[] = "{$missedMedicationCount} missed/refused medication administration(s) need reconciliation";
        }
        if ($providerNotifiedCount > 0) {
            $reasons[] = "{$providerNotifiedCount} behavior event(s) were escalated to a provider";
        }
        if ($upcomingAppointments > 0) {
            $reasons[] = "{$upcomingAppointments} upcoming appointment(s) need preparation/follow-through";
        }
        if ($behaviorCount > 0) {
            $reasons[] = "{$behaviorCount} behavior chart event(s) suggest ongoing pattern tracking";
        }
        if ($faxCount > 0) {
            $reasons[] = "{$faxCount} recent fax communication(s) may include care updates";
        }

        if (empty($reasons)) {
            return "Follow-up list: {$residentName} can remain on routine monitoring with no urgent follow-up flags in the current review window.";
        }

        return "Follow-up list: {$residentName} may need follow-up because ".implode('; ', $reasons).'.';
    }

    private function buildFacilityFollowUpListSummary(array $candidates): string
    {
        $list = array_slice(array_values(array_filter($candidates, fn ($item) => is_array($item))), 0, 5);

        if (empty($list)) {
            return 'Follow-up list: no residents are currently flagged for urgent follow-up in this review window.';
        }

        $parts = array_map(function (array $item): string {
            $name = (string) ($item['name'] ?? 'Resident');
            $reasons = is_array($item['reasons'] ?? null) ? $item['reasons'] : [];
            $reasonText = ! empty($reasons)
                ? implode('; ', array_slice($reasons, 0, 3))
                : 'general trend review recommended';

            return "{$name} ({$reasonText})";
        }, $list);

        return 'Follow-up list: '.implode(' | ', $parts).'.';
    }

    private function buildFollowUpMonitorSummary(
        int $criticalCount,
        int $warningCount,
        ?string $latestStatus,
        int $missedMedicationCount,
        int $providerNotifiedCount,
        int $upcomingAppointments,
        int $behaviorCount,
        int $avgSleepHoursRoundedUp
    ): string {
        $immediate = [];
        $monitor = [];

        if ($criticalCount > 0) {
            $immediate[] = "escalate {$criticalCount} critical vital reading(s) now";
        }
        if ($warningCount > 0) {
            $immediate[] = "review {$warningCount} warning vital reading(s) for same-shift follow-up";
        }
        if ($latestStatus && $latestStatus !== 'approved') {
            $immediate[] = "resolve latest vitals status ({$latestStatus})";
        }
        if ($missedMedicationCount > 0) {
            $immediate[] = "reconcile {$missedMedicationCount} missed/refused medication administration(s)";
        }
        if ($providerNotifiedCount > 0) {
            $immediate[] = "confirm provider-notified behavior events ({$providerNotifiedCount}) are documented";
        }
        if ($upcomingAppointments > 0) {
            $immediate[] = "confirm {$upcomingAppointments} upcoming appointment(s) and prep notes/transport";
        }

        if (empty($immediate)) {
            $immediate[] = 'no urgent follow-up items were flagged in this review window';
        }

        if ($criticalCount === 0 && $warningCount === 0) {
            $monitor[] = 'continue routine vitals monitoring; no urgent deviations detected';
        }
        if ($avgSleepHoursRoundedUp > 0) {
            $monitor[] = "track sleep trend (current average {$avgSleepHoursRoundedUp} hours)";
        }
        if ($behaviorCount > 0) {
            $monitor[] = "monitor behavior pattern frequency ({$behaviorCount} charted event(s))";
        }
        if ($missedMedicationCount === 0) {
            $monitor[] = 'maintain medication adherence checks each pass';
        }
        if (empty($monitor)) {
            $monitor[] = 'continue routine documentation and reassess next shift';
        }

        return 'Immediate follow-up: '.implode('; ', $immediate).'. Monitor: '.implode('; ', $monitor).'.';
    }

    private function formatSleepHours(float $hours): string
    {
        return (string) ceil($hours);
    }

    private function formatSleepQuality(float $quality): string
    {
        return number_format($quality, 1, '.', '');
    }

    private function buildHeuristicResult(array $payload, ?string $prompt = null): array
    {
        $residentName = $payload['resident']['name'] ?? 'the selected resident';
        $window = $payload['window'] ?? 'the selected period';
        $vitals = $payload['vitals'] ?? [];
        $comparison = is_array($payload['comparison'] ?? null) ? $payload['comparison'] : [];
        $facilityFollowUpCandidates = is_array($payload['facility_follow_up_candidates'] ?? null)
            ? $payload['facility_follow_up_candidates']
            : [];
        $sleep = $payload['sleep'] ?? [];
        $behaviorCharts = $payload['behavior_charts'] ?? [];
        $appointments = $payload['appointments'] ?? [];

        $vitalCount = (int) ($vitals['count'] ?? 0);
        $criticalCount = (int) ($vitals['critical_count'] ?? 0);
        $warningCount = (int) ($vitals['warning_count'] ?? 0);
        $latestStatus = $vitals['latest']['status'] ?? null;
        $latestTemperature = $vitals['latest']['temperature'] ?? null;
        $latestPulse = $vitals['latest']['pulse'] ?? null;
        $latestOxygen = $vitals['latest']['oxygen_saturation'] ?? null;
        $avgSleepHours = (float) ($sleep['average_hours'] ?? 0);
        $avgSleepQuality = (float) ($sleep['average_quality'] ?? 0);
        $avgSleepHoursRoundedUp = (int) ceil($avgSleepHours);
        $avgSleepQualityFormatted = $this->formatSleepQuality($avgSleepQuality);
        $behaviorCount = (int) ($behaviorCharts['count'] ?? 0);
        $providerNotifiedCount = (int) ($behaviorCharts['provider_notified_count'] ?? 0);
        $behaviorLogCount = (int) ($behaviorCharts['log_count'] ?? 0);
        $upcomingAppointments = (int) ($appointments['upcoming_count'] ?? 0);
        $activeMedicationCount = (int) (($payload['medications']['active_count'] ?? 0));
        $missedMedicationCount = (int) (($payload['medications']['missed_count'] ?? 0));
        $faxCount = (int) (($payload['faxes']['count'] ?? 0));
        $previousVitalCount = (int) ($comparison['vitals']['count'] ?? 0);
        $previousCriticalCount = (int) ($comparison['vitals']['critical_count'] ?? 0);
        $previousWarningCount = (int) ($comparison['vitals']['warning_count'] ?? 0);
        $previousAvgSleepHours = (float) ($comparison['sleep']['average_hours'] ?? 0);
        $previousAvgSleepHoursRoundedUp = (int) ceil($previousAvgSleepHours);
        $previousAvgSleepQuality = (float) ($comparison['sleep']['average_quality'] ?? 0);
        $previousAvgSleepQualityFormatted = $this->formatSleepQuality($previousAvgSleepQuality);
        $previousBehaviorCount = (int) ($comparison['behavior_charts']['count'] ?? 0);
        $previousProviderNotifiedCount = (int) ($comparison['behavior_charts']['provider_notified_count'] ?? 0);
        $previousUpcomingAppointments = (int) ($comparison['appointments']['upcoming_count'] ?? 0);
        $previousActiveMedicationCount = (int) ($comparison['medications']['active_count'] ?? 0);
        $previousMissedMedicationCount = (int) ($comparison['medications']['missed_count'] ?? 0);
        $previousFaxCount = (int) ($comparison['faxes']['count'] ?? 0);

        if ($this->isFollowUpListPrompt($prompt)) {
            $summary = ! empty($facilityFollowUpCandidates)
                ? $this->buildFacilityFollowUpListSummary($facilityFollowUpCandidates)
                : $this->buildFollowUpListSummary(
                    $residentName,
                    $criticalCount,
                    $warningCount,
                    $missedMedicationCount,
                    $providerNotifiedCount,
                    $upcomingAppointments,
                    $behaviorCount,
                    $faxCount
                );
        } elseif ($this->isFollowUpMonitorPrompt($prompt)) {
            $summary = $this->buildFollowUpMonitorSummary(
                $criticalCount,
                $warningCount,
                $latestStatus,
                $missedMedicationCount,
                $providerNotifiedCount,
                $upcomingAppointments,
                $behaviorCount,
                $avgSleepHoursRoundedUp
            );
        } elseif ($this->isComparisonPrompt($prompt) && ! empty($comparison)) {
            $summaryParts = [
                "vitals entries were {$vitalCount} versus {$previousVitalCount} in the prior period",
                "medication orders were {$activeMedicationCount} versus {$previousActiveMedicationCount}, with {$missedMedicationCount} missed administration(s) versus {$previousMissedMedicationCount}",
                "sleep averaged {$avgSleepHoursRoundedUp} hours at a {$avgSleepQualityFormatted} quality score versus {$previousAvgSleepHoursRoundedUp} hours at {$previousAvgSleepQualityFormatted}",
                "behavior charts were {$behaviorCount} versus {$previousBehaviorCount} and provider alerts were {$providerNotifiedCount} versus {$previousProviderNotifiedCount}",
            ];

            if ($criticalCount > 0) {
                $summaryParts[] = "{$criticalCount} critical observation(s) still require review";
            } elseif ($previousCriticalCount > 0) {
                $summaryParts[] = "critical observations improved from {$previousCriticalCount} to none";
            } else {
                $summaryParts[] = 'no urgent vital deviations were detected in either period';
            }

            if ($warningCount > 0 || $previousWarningCount > 0) {
                $summaryParts[] = "warnings changed from {$previousWarningCount} to {$warningCount}";
            }

            if ($upcomingAppointments > 0 || $previousUpcomingAppointments > 0) {
                $summaryParts[] = "upcoming appointments changed from {$previousUpcomingAppointments} to {$upcomingAppointments}";
            }

            if ($faxCount > 0 || $previousFaxCount > 0) {
                $summaryParts[] = "recent fax messages changed from {$previousFaxCount} to {$faxCount}";
            }

            $summary = ucfirst('Compared with the prior period, '.implode(', ', $summaryParts)).'.';
        } else {
            $summaryParts = ["$residentName had {$vitalCount} vitals entries during {$window}"];

            if ($activeMedicationCount > 0) {
                $summaryParts[] = 'there are '.$activeMedicationCount.' active medication orders and '.$missedMedicationCount.' missed administration(s) in the review window';
            }

            if ($faxCount > 0) {
                $summaryParts[] = 'there are '.$faxCount.' recent fax message(s) related to the resident';
            }

            if ($criticalCount > 0) {
                $summaryParts[] = "$criticalCount critical observation(s) and {$warningCount} warning(s) should be reviewed immediately";
            } elseif ($warningCount > 0) {
                $summaryParts[] = "$warningCount warning(s) indicate a need for closer monitoring";
            } else {
                $summaryParts[] = 'no urgent vital deviations were detected';
            }

            if ($avgSleepHours > 0) {
                $summaryParts[] = "average sleep was {$avgSleepHoursRoundedUp} hours with a quality score of {$avgSleepQualityFormatted}";
            }

            if ($behaviorCount > 0) {
                $summaryParts[] = "$behaviorCount behavior chart record(s) were captured and {$providerNotifiedCount} provider alert(s) were triggered";
            }

            if ($upcomingAppointments > 0) {
                $summaryParts[] = "$upcomingAppointments upcoming appointment(s) should be confirmed";
            }

            $summary = ucfirst(implode(', ', $summaryParts)).'.';
        }

        $insights = [];
        if ($missedMedicationCount > 0) {
            $insights[] = 'Medication adherence needs attention because some administrations were missed or unresolved.';
        }
        if ($faxCount > 0) {
            $insights[] = 'Recent fax communications may contain follow-up instructions or care updates that should be reviewed.';
        }
        if ($criticalCount > 0) {
            $insights[] = 'Critical readings are present, so escalation and care-plan review are the priority.';
        }
        if ($latestStatus && $latestStatus !== 'approved') {
            $insights[] = 'The latest vitals status is '.$latestStatus.', which warrants follow-up.';
        }
        if ($avgSleepHours > 0 && $avgSleepHours < 7) {
            $insights[] = 'Sleep is trending below the preferred range and may be affecting recovery.';
        }
        if ($behaviorLogCount > 0) {
            $insights[] = 'Behavior logs show activity that should be tracked against the care plan.';
        }
        if ($upcomingAppointments > 0) {
            $insights[] = 'Upcoming appointments create a scheduling and preparation opportunity for the care team.';
        }
        if (empty($insights)) {
            $insights[] = 'No urgent pattern surfaced; routine monitoring and documentation remain the right next step.';
        }

        $recommendations = [];
        if ($missedMedicationCount > 0) {
            $recommendations[] = 'Review the missed medication entries and confirm whether follow-up or care-team escalation is needed.';
        }
        if ($faxCount > 0) {
            $recommendations[] = 'Review the recent fax messages for provider updates, referrals, or care-plan changes.';
        }
        if ($criticalCount > 0) {
            $recommendations[] = 'Escalate the latest critical values and confirm whether the current care plan needs adjustment.';
        }
        if ($avgSleepHours > 0 && $avgSleepHours < 7) {
            $recommendations[] = 'Review sleep support details and consider environmental adjustments or comfort interventions.';
        }
        if ($behaviorLogCount > 0) {
            $recommendations[] = 'Review the recent behavior notes with the care team and track whether triggers are recurring.';
        }
        if ($upcomingAppointments > 0) {
            $recommendations[] = 'Confirm upcoming appointments and prepare any required clinical notes or transportation plans.';
        }
        if (empty($recommendations)) {
            $recommendations[] = 'Continue routine monitoring and document any changes in condition or care needs.';
        }

        return [
            'summary' => $summary,
            'insights' => $insights,
            'recommendations' => $recommendations,
            'resident' => ['name' => $residentName],
            'window' => $window,
        ];
    }

    private function normalizeList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(function ($item) {
                if (is_string($item)) {
                    return trim($item);
                }

                if (is_array($item)) {
                    return trim((string) ($item['text'] ?? $item['message'] ?? ''));
                }

                return null;
            }, $value)));
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map('trim', preg_split('/\r\n|\n/', $value) ?: [])));
        }

        return [];
    }
}
