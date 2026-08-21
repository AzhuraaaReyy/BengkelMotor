<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray($request)
    {
        $charge = $this->latestCharge;

        return [
            'id' => $this->id,
            'sale_code' => $this->sale_code,
            'status' => $this->status,
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'grand_total' => $this->grand_total,
            'payment_method' => $this->payment_method,
            'paid_amount' => $this->paid_amount,
            'change_amount' => $this->change_amount,
            'paid_at' => $this->paid_at,
            'void_reason' => $this->void_reason,
            'voided_at' => $this->voided_at,
            'payment_expires_at' => $charge?->expires_at,
            'gateway_transaction_id' => $charge?->gateway_transaction_id,
            'gateway_type' => $charge?->gateway_type,
            'gateway_va_number' => $charge?->va_number,
            'gateway_qr_url' => $charge?->qr_url,
            'gateway_qr_string' => $charge?->qr_string,
            'gateway_deeplink' => $charge?->deeplink,
            'cashier' => $this->whenLoaded('cashier', fn() => $this->cashier ? [
                'id' => $this->cashier->id,
                'name' => $this->cashier->name,
            ] : null),
            'customer' => $this->whenLoaded('customer', fn() => $this->customer ? [
                'id' => $this->customer->id,
                'name' => $this->customer->name,
            ] : null),
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
