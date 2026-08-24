<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max($request->integer('per_page', 10), 1), 500);

        $logs = AuditLog::with('user:id,name,username')
            ->when($request->action, fn($q, $a) => $q->where('action', $a))
            ->when($request->entity_type, fn($q, $e) => $q->where('entity_type', $e))
            ->when($request->from && $request->to, fn($q) => $q->whereBetween('created_at', [$request->from, $request->to]))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json(['data' => $logs]);
    }
}
