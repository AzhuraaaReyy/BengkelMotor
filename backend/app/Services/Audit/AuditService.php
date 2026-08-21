<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**Write an audit log entry. Sensitive fields (password/hash/token) must be
     * stripped before passing before/after data.
     */
    public function log(string $action, string $entityType, ?int $entityId = null, ?array $before = null, ?array $after = null, ?string $reason = null, ?int $userId = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'before_data' => $before,
            'after_data' => $after,
            'reason' => $reason,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 500),
            'created_at' => now(),
        ]);
    }
}
