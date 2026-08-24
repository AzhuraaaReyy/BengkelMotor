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
            $existing = $this->notification->getUnreadStockForProduct($user, $product->id);
            $isOut = $currentStock <= 0;

            if ($existing) {
                $data = $existing->data ?? [];
                $existingStock = (int) ($data['current_stock'] ?? -1);
                $existingOut = $existingStock <= 0;

                // Lewati hanya bila kondisi identik; ganti snapshot usang
                // agar "Stok Habis!" tidak menggantung setelah restock
                // sebagian (mis. 0 -> 3 harus jadi "Stok Menipis 3").
                if ($existingOut === $isOut && $existingStock === $currentStock) {
                    continue;
                }
                $existing->delete();
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
