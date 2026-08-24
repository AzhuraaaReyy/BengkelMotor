<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\AuditLog;
use App\Models\Service;
use App\Services\Audit\AuditService;
use App\Support\CodeGenerator;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request)
    {
        // POS catalog requests all items (per_page=200 / all=1); honor it
        // with a hard cap so a huge catalog cannot be dumped in one response.
        $perPage = $request->boolean('all')
            ? 1000
            : min(max($request->integer('per_page', 10), 1), 500);

        $services = Service::query()
            ->when($request->search, fn($q, $s) => $q->where(
                fn($qq) =>
                $qq->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%")
            ))
            ->orderBy('name')
            ->paginate($perPage)
            ->through(fn (Service $service) => new ServiceResource($service));

        return response()->json(['data' => $services]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $service = Service::create([
            'code' => CodeGenerator::serviceCode($validated['name']),
            'name' => $validated['name'],
            'sale_price' => $validated['sale_price'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->audit->log(
            AuditLog::ACTION_SERVICE_CREATED,
            'service',
            $service->id,
            null,
            ['name' => $service->name, 'sale_price' => $service->sale_price]
        );

        return response()->json(['data' => new ServiceResource($service), 'message' => 'Jasa dibuat.'], 201);
    }

    public function update(Request $request, Service $service)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'sale_price' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $before = $service->only(['name', 'sale_price', 'is_active']);
        $service->update($validated);

        $this->audit->log(
            AuditLog::ACTION_SERVICE_UPDATED,
            'service',
            $service->id,
            $before,
            $service->only(['name', 'sale_price', 'is_active'])
        );

        return response()->json(['data' => new ServiceResource($service), 'message' => 'Jasa diperbarui.']);
    }
}
