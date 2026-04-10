<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends BaseApiController
{
    /**
     * Build a facility-scoped query for the current user's notifications.
     */
    private function scopedQuery()
    {
        $user = auth()->user();
        $query = $user->notifications()->latest();

        // Non-super-admins only see notifications for their facility
        if ($user->role !== 'super_admin' && $user->facility_id) {
            $query->where(function ($q) use ($user) {
                $q->where('facility_id', $user->facility_id)
                  ->orWhereNull('facility_id'); // include system-level notifications
            });
        }

        return $query;
    }

    /**
     * Get notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->scopedQuery();

        // Filter by read status
        if ($request->get('unread_only') === 'true') {
            $query->unread();
        } elseif ($request->get('read_only') === 'true') {
            $query->read();
        }

        // Filter by type
        if ($type = $request->get('type')) {
            $query->ofType($type);
        }

        // Cursor-based pagination: fetch older notifications
        if ($before = $request->get('before')) {
            $query->where('id', '<', (int) $before);
        }

        $limit = min((int) $request->get('limit', 20), 50);
        $notifications = $query->limit($limit)->get();

        // Unread count — single query, no N+1
        $unreadCount = $this->scopedQuery()->unread()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Get count of unread notifications.
     */
    public function count(): JsonResponse
    {
        return response()->json([
            'count' => $this->scopedQuery()->unread()->count(),
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead($id): JsonResponse
    {
        $notification = auth()->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        $this->scopedQuery()->unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Delete a single notification.
     */
    public function destroy($id): JsonResponse
    {
        $notification = auth()->user()->notifications()->findOrFail($id);
        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted',
        ]);
    }

    /**
     * Clear all read notifications.
     */
    public function clearRead(): JsonResponse
    {
        $deleted = $this->scopedQuery()->read()->delete();

        return response()->json([
            'message' => "Cleared {$deleted} read notifications",
            'deleted_count' => $deleted,
        ]);
    }
}
