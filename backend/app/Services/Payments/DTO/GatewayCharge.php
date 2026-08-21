<?php

namespace App\Services\Payments\DTO;

readonly class GatewayCharge
{
    public function __construct(
        public ?string $gatewayTransactionId,
        public string $method,
        public ?string $qrUrl,
        public ?string $qrString,
        public ?string $vaNumber,
        public ?string $deepLink,
        public \DateTimeInterface $expiresAt,
    ) {}
}
