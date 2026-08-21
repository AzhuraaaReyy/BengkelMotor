<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'category' => $this->category,
            'brand' => $this->brand,
            'unit' => $this->unit,
            'sale_price' => $this->sale_price,
            'current_stock' => $this->current_stock,
            'min_stock' => $this->min_stock,
            'is_active' => $this->is_active,
            'is_low_stock' => $this->isLowStock(),
            // purchase_price only exposed to Admin.
            'purchase_price' => $this->when($this->purchasePriceVisible(), $this->purchase_price),
        ];
    }

    // Expose purchase_price to non-admin only when the caller explicitly asks
    // for it (management page's Atur Stok preview). The POS catalog never sends
    // this flag, so Cashiers cannot read costs there (security.md A9).
    public static function includePurchasePriceForRequest(): bool
    {
        return request()->boolean('include_cost');
    }

    public static function purchasePriceVisible(): bool
    {
        return auth()->check() && (auth()->user()->isAdmin() || static::includePurchasePriceForRequest());
    }
}
