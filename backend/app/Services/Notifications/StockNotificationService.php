<?php

namespace App\Services\Notifications;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StockNotificationService
{
    private const STOCK_THRESHOLD = 5;

    public function __construct(private NotificationService $notification) {}

    public function check(Product $product, ?int $currentStock = null): void
    {
        if ($currentStock === null) {
            $product->refresh();
            $currentStock = $product->current_stock;
        }

        if ($currentStock >= self::STOCK_THRESHOLD) {
            // Stok sudah aman → bersihkan notifikasi stok lama produk ini.
            $this->notification->deleteStockForProduct($product->id);
            return;
        }

        $users = User::where('is_active', true)->get();

        foreach ($users as $user) {
            $exists = $this->notification->hasUnreadStockForProduct($user, $product->id);
            $isOut = $currentStock <= 0;

            // 🚀 PERBAIKAN: Jika notifikasi lama sudah ada TAPI stok sekarang HABIS (<=0),
            // tetap izinkan notifikasi baru dibuat agar kasir tahu stok benar-benar habis!
            if ($exists && !$isOut) {
                continue;
            }

            $title = $isOut ? 'Stok Habis!' : 'Stok Menipis';

            // Format pesan yang lebih informatif
            $message = $isOut
                ? sprintf('Stok produk %s telah habis (0 %s)!', $product->name, $product->unit)
                : sprintf('Produk %s tersisa %d %s', $product->name, $currentStock, $product->unit);

            $this->notification->create($user, 'STOCK', $title, $message, [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'current_stock' => $currentStock,
                'min_stock' => self::STOCK_THRESHOLD,
                'unit' => $product->unit,
            ]);
        }
    }
}
