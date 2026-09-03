<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Service;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->input('q', '');
        
        if (strlen($query) < 2) {
            return response()->json([
                'products' => [],
                'services' => [],
                'customers' => [],
                'sales' => [],
                'total' => 0,
            ]);
        }

        // Sanitize query untuk mencegah SQL injection
        $sanitized = str_replace(['%', '_'], ['\\%', '\\_'], $query);

        // Search Products
        $products = Product::where(function ($q) use ($sanitized) {
            $q->where('name', 'like', "%{$sanitized}%")
              ->orWhere('sku', 'like', "%{$sanitized}%")
              ->orWhere('category', 'like', "%{$sanitized}%")
              ->orWhere('brand', 'like', "%{$sanitized}%");
        })
        ->where('is_active', true)
        ->limit(5)
        ->get(['id', 'name', 'sku', 'category', 'current_stock', 'sale_price', 'image'])
        ->map(fn ($p) => [
            'id' => $p->id,
            'type' => 'product',
            'name' => $p->name,
            'sku' => $p->sku,
            'category' => $p->category,
            'current_stock' => $p->current_stock,
            'sale_price' => $p->sale_price,
            'image' => $p->image,
        ]);

        // Search Services
        $services = Service::where(function ($q) use ($sanitized) {
            $q->where('name', 'like', "%{$sanitized}%")
              ->orWhere('description', 'like', "%{$sanitized}%");
        })
        ->where('is_active', true)
        ->limit(5)
        ->get(['id', 'name', 'sale_price', 'description'])
        ->map(fn ($s) => [
            'id' => $s->id,
            'type' => 'service',
            'name' => $s->name,
            'sale_price' => $s->sale_price,
            'description' => $s->description,
        ]);

        // Search Customers
        $customers = Customer::where(function ($q) use ($sanitized) {
            $q->where('name', 'like', "%{$sanitized}%")
              ->orWhere('phone', 'like', "%{$sanitized}%")
              ->orWhere('email', 'like', "%{$sanitized}%");
        })
        ->limit(5)
        ->get(['id', 'name', 'phone', 'email'])
        ->map(fn ($c) => [
            'id' => $c->id,
            'type' => 'customer',
            'name' => $c->name,
            'phone' => $c->phone,
            'email' => $c->email,
        ]);

        // Search Sales (by sale_code or customer name)
        $sales = Sale::with('customer:id,name')
            ->where(function ($q) use ($sanitized) {
                $q->where('sale_code', 'like', "%{$sanitized}%");
            })
            ->orWhereHas('customer', function ($q) use ($sanitized) {
                $q->where('name', 'like', "%{$sanitized}%");
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'sale_code', 'customer_id', 'grand_total', 'status', 'created_at'])
            ->map(fn ($s) => [
                'id' => $s->id,
                'type' => 'sale',
                'sale_code' => $s->sale_code,
                'customer_name' => $s->customer?->name,
                'grand_total' => $s->grand_total,
                'status' => $s->status,
                'created_at' => $s->created_at,
            ]);

        $total = $products->count() + $services->count() + $customers->count() + $sales->count();

        return response()->json([
            'products' => $products,
            'services' => $services,
            'customers' => $customers,
            'sales' => $sales,
            'total' => $total,
        ]);
    }
}
