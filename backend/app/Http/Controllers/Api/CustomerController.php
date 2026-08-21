<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::when($request->search, fn($q, $s) => $q->where(
                fn($qq) =>
                $qq->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")
            ))
            ->orderBy('name')
            ->paginate(15);

        return response()->json(['data' => $customers]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'motorcycle_type' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $customer = Customer::create($validated);
        return response()->json(['data' => $customer, 'message' => 'Pelanggan dibuat.'], 201);
    }

    public function show(Customer $customer)
    {
        return response()->json(['data' => $customer]);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'motorcycle_type' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $customer->update($validated);
        return response()->json(['data' => $customer, 'message' => 'Pelanggan diperbarui.']);
    }
}
