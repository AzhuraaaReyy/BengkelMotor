<?php

namespace Tests\Feature\Reports;

use App\Models\Expense;
use App\Models\Product;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    public function test_cashier_cannot_export_any_report(): void
    {
        $cashier = $this->cashier();

        foreach (['sales', 'services', 'inventory', 'finance'] as $type) {
            $this->actingAs($cashier)->postJson("/api/v1/reports/{$type}/export", ['format' => 'xlsx'])
                ->assertStatus(403);
        }
    }

    public function test_admin_can_export_sales_report_as_xlsx(): void
    {
        $admin = $this->admin();
        $cashier = $this->cashier();
        $product = Product::factory()->create(['sale_price' => 20000, 'current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $response = $this->actingAs($admin)->postJson('/api/v1/reports/sales/export', ['format' => 'xlsx']);

        $response->assertStatus(200);
        $this->assertSame(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
    }

    public function test_admin_can_export_finance_report_as_pdf(): void
    {
        $admin = $this->admin();
        Expense::factory()->create(['created_by' => $admin->id]);

        $response = $this->actingAs($admin)->postJson('/api/v1/reports/finance/export', ['format' => 'pdf']);

        $response->assertStatus(200);
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_export_rejects_invalid_report_type(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/v1/reports/does-not-exist/export', ['format' => 'xlsx'])
            ->assertStatus(404);
    }

    public function test_export_rejects_invalid_format(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/v1/reports/sales/export', ['format' => 'docx'])
            ->assertStatus(422);
    }

    public function test_export_works_for_all_report_types(): void
    {
        $admin = $this->admin();

        foreach (['sales', 'services', 'inventory', 'finance'] as $type) {
            foreach (['xlsx', 'pdf'] as $format) {
                $this->actingAs($admin)->postJson("/api/v1/reports/{$type}/export", ['format' => $format])
                    ->assertStatus(200);
            }
        }
    }
}
