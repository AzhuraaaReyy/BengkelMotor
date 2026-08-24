<?php

namespace Tests\Unit\Services;

use App\Services\Notifications\NotificationService;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    public function test_marking_transaction_as_read_deletes_it(): void
    {
        $user = $this->cashier();
        $n = app(NotificationService::class)->create($user, 'TRANSACTION', 'Transaksi Berhasil', 'TRX-1 dibayar');
        app(NotificationService::class)->markAsRead($n);
        $this->assertDatabaseMissing('notifications', ['id' => $n->id]);
    }

    public function test_marking_stock_as_read_does_not_delete_it(): void
    {
        $user = $this->cashier();
        $n = app(NotificationService::class)->create($user, 'STOCK', 'Stok Menipis', 'Oli tersisa 3');
        app(NotificationService::class)->markAsRead($n);
        $this->assertDatabaseHas('notifications', ['id' => $n->id]);
        $this->assertNotNull($n->fresh()->read_at);
    }

    public function test_mark_all_as_read_deletes_transactions_only(): void
    {
        $user = $this->cashier();
        $svc = app(NotificationService::class);
        $svc->create($user, 'TRANSACTION', 'T1', 'm');
        $svc->create($user, 'STOCK', 'S1', 'm');
        $svc->markAllAsRead($user);
        $this->assertDatabaseMissing('notifications', ['title' => 'T1']);
        $this->assertDatabaseHas('notifications', ['title' => 'S1']);
    }
}
