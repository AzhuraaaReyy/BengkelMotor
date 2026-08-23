<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ServiceOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'order_code' => $this->order_code,
            'customer_id' => $this->customer_id,
            'motorcycle_type' => $this->motorcycle_type,
            'cashier_id' => $this->cashier_id,
            'mechanic_id' => $this->mechanic_id,
            'complaint' => $this->complaint,
            'diagnosis_note' => $this->diagnosis_note,
            'status' => $this->status,
            'opened_at' => $this->opened_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'customer' => $this->whenLoaded('customer', fn() => new CustomerResource($this->customer)),
            'mechanic' => $this->whenLoaded('mechanic', fn() => new MechanicResource($this->mechanic)),
            'cashier' => $this->whenLoaded('cashier', fn() => $this->cashier?->only(['id', 'name'])),
            'sale' => $this->whenLoaded('sale', fn() => $this->sale?->only(['id', 'sale_code', 'status', 'grand_total', 'paid_at'])),
        ];
    }
}