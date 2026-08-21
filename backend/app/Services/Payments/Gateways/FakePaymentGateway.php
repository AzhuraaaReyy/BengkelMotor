<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;

class FakePaymentGateway implements PaymentGateway
{
    public bool $signatureValid = true;
    public int $chargeCalls = 0;

    public function createCharge(PendingChargeRequest $request): GatewayCharge
    {
        $this->chargeCalls++;
        return match ($request->method) {
            'QRIS' => new GatewayCharge(
                gatewayTransactionId: 'TX-QRIS-' . $request->orderId,
                method: 'QRIS',
                qrUrl: 'https://example.test/qr/' . $request->orderId,
                qrString: 'QR:' . $request->orderId,
                deepLink: null,
                vaNumber: null,
                expiresAt: now()->addMinutes(15),
            ),
            'VA' => new GatewayCharge(
                gatewayTransactionId: 'TX-VA-' . $request->orderId,
                method: 'VA',
                qrUrl: null,
                qrString: null,
                deepLink: null,
                vaNumber: '1234567890',
                expiresAt: now()->addMinutes(15),
            ),
            'GOPAY' => new GatewayCharge(
                gatewayTransactionId: 'TX-GP-' . $request->orderId,
                method: 'GOPAY',
                qrUrl: null,
                qrString: null,
                deepLink: 'gopay://pay/' . $request->orderId,
                vaNumber: null,
                expiresAt: now()->addMinutes(15),
            ),
        };
    }

    public function verifySignature(array $payload, string $signature): bool
    {
        return $this->signatureValid;
    }

    public function parseNotification(array $payload): GatewayNotification
    {
        return new GatewayNotification(
            orderId: (string) ($payload['order_id'] ?? ''),
            status: ($payload['transaction_status'] ?? '') === 'settlement' ? 'PAID' : 'EXPIRED',
            grossAmount: (string) ($payload['gross_amount'] ?? '0'),
            gatewayTransactionId: 'TX-' . ($payload['order_id'] ?? ''),
        );
    }
}
