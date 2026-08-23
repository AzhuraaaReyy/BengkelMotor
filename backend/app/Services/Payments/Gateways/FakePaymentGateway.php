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
                qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($this->generateQrisEmvco($request->orderId, $request->saleCode, (int) $request->grossAmount)),
                qrString: $this->generateQrisEmvco($request->orderId, $request->saleCode, (int) $request->grossAmount),
                deepLink: null,
                vaNumber: null,
                expiresAt: now()->addMinutes(10),
            ),
            'VA' => new GatewayCharge(
                gatewayTransactionId: 'TX-VA-' . $request->orderId,
                method: 'VA',
                qrUrl: null,
                qrString: null,
                deepLink: null,
                vaNumber: '1234567890',
                expiresAt: now()->addMinutes(10),
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

    /**
     * Generate QRIS EMVCo string for testing
     * Format: EMVCo QR Code Specification for Indonesia QRIS
     */
    public function generateQrisEmvco(int $orderId, string $saleCode, int $amount): string
    {
        // Payload Format Indicator
        $payload = '000201';
        
        // Point of Initiation Method (12 = dynamic QR)
        $payload .= '010212';
        
        // Merchant Account Information - QRIS
        $merchantAccount = '0016ID.CO.QRIS.WWW010215ID12345678901230303UME';
        $payload .= '26' . str_pad(strlen($merchantAccount), 2, '0', STR_PAD_LEFT) . $merchantAccount;
        
        // Merchant Category Code (5814 = Fast Food/Restaurant)
        $payload .= '52045814';
        
        // Transaction Currency (360 = IDR)
        $payload .= '5303360';
        
        // Transaction Amount
        $amountStr = (string)$amount;
        $payload .= '54' . str_pad(strlen($amountStr), 2, '0', STR_PAD_LEFT) . $amountStr;
        
        // Country Code (ID = Indonesia)
        $payload .= '5802ID';
        
        // Merchant Name (max 25 chars)
        $merchantName = 'BENGKEL TEST';
        $payload .= '59' . str_pad(strlen($merchantName), 2, '0', STR_PAD_LEFT) . $merchantName;
        
        // Merchant City (max 15 chars)
        $merchantCity = 'JAKARTA';
        $payload .= '60' . str_pad(strlen($merchantCity), 2, '0', STR_PAD_LEFT) . $merchantCity;
        
        // Postal Code
        $payload .= '610512345';
        
        // Additional Data Field Template - Reference Label (Order ID)
        $refLabel = 'ORDER-' . $saleCode;
        $addData = '05' . str_pad(strlen($refLabel), 2, '0', STR_PAD_LEFT) . $refLabel;
        $payload .= '62' . str_pad(strlen($addData), 2, '0', STR_PAD_LEFT) . $addData;
        
        // CRC16 Checksum
        $payload .= '6304';
        $crc = $this->calculateCrc16($payload);
        $payload .= $crc;
        
        return $payload;
    }

    /**
     * Calculate CRC16-CCITT (XModem) checksum for QRIS
     */
    private function calculateCrc16(string $data): string
    {
        $crc = 0xFFFF;
        $polynomial = 0x1021;
        
        for ($i = 0; $i < strlen($data); $i++) {
            $crc ^= (ord($data[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = ($crc << 1) ^ $polynomial;
                } else {
                    $crc <<= 1;
                }
            }
        }
        
        return strtoupper(str_pad(dechex($crc & 0xFFFF), 4, '0', STR_PAD_LEFT));
    }
}
