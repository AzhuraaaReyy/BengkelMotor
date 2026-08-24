<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Notifications\StockNotificationService;
use Illuminate\Console\Command;

class SyncStockNotifications extends Command
{
    protected $signature = 'notifications:sync-stock';
    protected $description = 'Rekonsiliasi notifikasi stok dengan kondisi stok terkini semua produk aktif';

    public function handle(StockNotificationService $stockNotification): int
    {
        // Sweep konvergen: produk rendah/habus mendapat (atau diperbarui)
        // notifikasinya; produk yang sudah aman >= 5 dibersihkan
        // notifikasi stoknya oleh check() sendiri.
        $checked = 0;
        foreach (Product::where('is_active', true)->cursor() as $product) {
            $stockNotification->check($product, (int) $product->current_stock);
            $checked++;
        }

        $this->info("Stock notifications synced for {$checked} products.");
        return self::SUCCESS;
    }
}