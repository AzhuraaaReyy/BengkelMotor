<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $logs = AuditLog::with('user:id,name,username')
            ->when($request->action, fn($q, $a) => $q->where('action', $a))
            ->when($request->entity_type, fn($q, $e) => $q->where('entity_type', $e))
            ->when($request->from && $request->to, fn($q) => $q->whereBetween('created_at', [$request->from, $request->to]))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(['data' => $logs]);
    }
}
