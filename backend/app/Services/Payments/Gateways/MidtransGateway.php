<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MidtransGateway implements PaymentGateway
{
    private string $base;
    private string $serverKey;

    public function __construct()
    {
        $this->base = rtrim((string) config('services.midtrans.charge_url'), '/');
        $this->serverKey = (string) config('services.midtrans.server_key');
    }

    public function createCharge(PendingChargeRequest $request): GatewayCharge
    {
        $payload = [
            'transaction_details' => [
                'order_id' => $request->saleCode,
                'gross_amount' => $request->grossAmount,
            ],
            'item_details' => array_map(fn ($i) => [
                'id' => $i['id'] ?? null,
                'name' => $i['name'],
                'price' => $i['price'],
                'quantity' => $i['quantity'],
            ], $request->items),
            'customer_details' => $request->customer ?? new \stdClass(),
            'expiry' => ['unit' => 'minutes', 'duration' => 15],
        ];

        $payload['payment_type'] = match ($request->method) {
            'QRIS' => 'qris',
            'VA' => 'bank_transfer',
            'GOPAY' => 'gopay',
            default => throw new RuntimeException("Unsupported method: {$request->method}", 422),
        };
        if ($payload['payment_type'] === 'bank_transfer') {
            $payload['bank_transfer'] = ['bank' => 'bca'];
        }

        $response = Http::withBasicAuth($this->serverKey, '')
            ->acceptJson()
            ->post("{$this->base}/charge", $payload);

        if (!$response->successful()) {
            throw new RuntimeException('Payment gateway error: ' . $response->body(), $response->status());
        }

        $body = $response->json();
        $qrUrl = null;
        $qrString = null;
        $vaNumber = null;
        $deepLink = null;

        foreach ($body['actions'] ?? [] as $action) {
            if (isset($action['name'], $action['url'])) {
                match ($action['name']) {
                    'generate-qr-code' => $qrUrl = $action['url'],
                    'deeplink-redirect' => $deepLink = $action['url'],
                    'qr-code' => $qrString = $action['url'],
                    default => null,
                };
            }
        }

        return new GatewayCharge(
            gatewayTransactionId: $body['transaction_id'] ?? null,
            method: $request->method,
            qrUrl: $qrUrl,
            qrString: $qrString,
            vaNumber: $body['va_numbers'][0]['va_number'] ?? null,
            deepLink: $deepLink,
            expiresAt: isset($body['expiry_time']) ? new \DateTime($body['expiry_time']) : now()->addMinutes(15),
        );
    }

    public function verifySignature(array $payload, string $signature): bool
    {
        $orderId = $payload['order_id'] ?? '';
        $statusCode = $payload['status_code'] ?? '';
        $grossAmount = $payload['gross_amount'] ?? '';
        $expected = hash('sha512', $orderId . $statusCode . $grossAmount . $this->serverKey);
        return hash_equals($expected, $signature);
    }

    public function parseNotification(array $payload): GatewayNotification
    {
        $status = match ($payload['transaction_status'] ?? null) {
            'settlement', 'capture' => 'PAID',
            'deny', 'expire', 'cancel' => 'EXPIRED',
            default => 'FAILED',
        };
        return new GatewayNotification(
            orderId: (string) ($payload['order_id'] ?? ''),
            status: $status,
            grossAmount: (string) ($payload['gross_amount'] ?? '0'),
            gatewayTransactionId: (string) ($payload['transaction_id'] ?? ''),
        );
    }
}
