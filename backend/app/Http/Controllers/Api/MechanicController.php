<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MechanicResource;
use App\Models\Mechanic;
use Illuminate\Http\Request;

class MechanicController extends Controller
{
    public function index(Request $request)
    {
        $mechanics = Mechanic::query()
            ->when($request->boolean('active_only'), fn($q) => $q->where('is_active', true))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', '%' . str_replace(['%', '_'], ['\\%', '\\_'], $s) . '%'))
            ->orderBy('name')
            ->paginate(15)
            ->through(fn (Mechanic $mechanic) => new MechanicResource($mechanic));

        return response()->json(['data' => $mechanics]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $mechanic = Mechanic::create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json(['data' => new MechanicResource($mechanic), 'message' => 'Mekanik dibuat.'], 201);
    }

    public function update(Request $request, Mechanic $mechanic)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $mechanic->update($validated);
        return response()->json(['data' => new MechanicResource($mechanic), 'message' => 'Mekanik diperbarui.']);
    }
}
