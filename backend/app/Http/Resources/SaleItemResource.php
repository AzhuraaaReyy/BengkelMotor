<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'item_type' => $this->item_type,
            'product_id' => $this->product_id,
            'service_id' => $this->service_id,
            'item_code_snapshot' => $this->item_code_snapshot,
            'item_name_snapshot' => $this->item_name_snapshot,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'subtotal' => $this->subtotal,
            // purchase_price_snapshot only exposed to Admin.
            'purchase_price_snapshot' => $this->when($this->shouldExpose(), $this->purchase_price_snapshot),
        ];
    }

    private function shouldExpose(): bool
    {
        return auth()->check() && auth()->user()->isAdmin();
    }
}
