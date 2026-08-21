<?php

namespace App\Services\Payments\Contracts;

use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;

interface PaymentGateway
{
    public function createCharge(PendingChargeRequest $request): GatewayCharge;
    public function verifySignature(array $payload, string $signature): bool;
    public function parseNotification(array $payload): GatewayNotification;
}
