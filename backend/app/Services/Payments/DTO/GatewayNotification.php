<?php

namespace App\Services\Payments\DTO;

readonly class GatewayNotification
{
    public function __construct(
        public string $orderId,
        public string $status,
        public string $grossAmount,
        public string $gatewayTransactionId,
    ) {}
}
