<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Services\PharmacyDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PharmacyDashboardController extends BaseApiController
{
    public function __construct(
        private PharmacyDashboardService $pharmacyDashboardService
    ) {
    }
    
    public function stats(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }
        
        $user = $request->user();
        $user->refresh(); // Ensure latest facility_id and assigned_branch_id
        
        $stats = $this->pharmacyDashboardService->getStats($user);
        
        return $this->success($stats);
    }
}

