<?php

namespace App\Services\Payments\DTO;

readonly class PendingChargeRequest
{
    public function __construct(
        public int $orderId,
        public string $saleCode,
        public string $method,
        public string $grossAmount,
        public array $items,
        public ?array $customer = null,
    ) {}
}
