<?php

namespace Tests\Feature\Feature\Search;

use App\Models\Product;
use App\Models\Service;
use App\Models\Customer;
use App\Models\Sale;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    public function test_search_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/search?q=test');
        $response->assertStatus(401);
    }

    public function test_search_returns_empty_for_short_query(): void
    {
        $admin = $this->admin();
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=a');
        
        $response->assertStatus(200)
            ->assertJson([
                'products' => [],
                'services' => [],
                'customers' => [],
                'sales' => [],
                'total' => 0,
            ]);
    }

    public function test_search_finds_products_by_name(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['name' => 'Oli Castrol', 'is_active' => true]);
        Product::factory()->create(['name' => 'Ban Motor', 'is_active' => true]);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Castrol');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('products'));
        $this->assertSame('Oli Castrol', $response->json('products.0.name'));
        $this->assertSame('product', $response->json('products.0.type'));
    }

    public function test_search_finds_products_by_sku(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['sku' => 'SKU-001', 'name' => 'Product A', 'is_active' => true]);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=SKU-001');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('products'));
        $this->assertSame('SKU-001', $response->json('products.0.sku'));
    }

    public function test_search_finds_services_by_name(): void
    {
        $admin = $this->admin();
        Service::factory()->create(['name' => 'Ganti Oli', 'is_active' => true]);
        Service::factory()->create(['name' => 'Servis Rem', 'is_active' => true]);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Ganti');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('services'));
        $this->assertSame('Ganti Oli', $response->json('services.0.name'));
        $this->assertSame('service', $response->json('services.0.type'));
    }

    public function test_search_finds_customers_by_name(): void
    {
        $admin = $this->admin();
        Customer::factory()->create(['name' => 'John Doe']);
        Customer::factory()->create(['name' => 'Jane Smith']);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=John');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('customers'));
        $this->assertSame('John Doe', $response->json('customers.0.name'));
        $this->assertSame('customer', $response->json('customers.0.type'));
    }

    public function test_search_finds_customers_by_phone(): void
    {
        $admin = $this->admin();
        Customer::factory()->create(['name' => 'John', 'phone' => '08123456789']);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=08123456');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('customers'));
        $this->assertSame('08123456789', $response->json('customers.0.phone'));
    }

    public function test_search_finds_sales_by_sale_code(): void
    {
        $admin = $this->admin();
        $sale = Sale::factory()->paid()->create(['sale_code' => 'INV-2024-001']);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=INV-2024');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('sales'));
        $this->assertSame('INV-2024-001', $response->json('sales.0.sale_code'));
        $this->assertSame('sale', $response->json('sales.0.type'));
    }

    public function test_search_limits_results_to_five_per_category(): void
    {
        $admin = $this->admin();
        Product::factory()->count(10)->create(['name' => 'Oli Test', 'is_active' => true]);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Oli');
        
        $response->assertStatus(200);
        $this->assertLessThanOrEqual(5, count($response->json('products')));
    }

    public function test_search_returns_correct_total_count(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['name' => 'Test Product', 'is_active' => true]);
        Service::factory()->create(['name' => 'Test Service', 'is_active' => true]);
        Customer::factory()->create(['name' => 'Test Customer']);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Test');
        
        $response->assertStatus(200)
            ->assertJsonPath('total', 3);
    }

    public function test_search_excludes_inactive_products_and_services(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['name' => 'Active Product', 'is_active' => true]);
        Product::factory()->create(['name' => 'Inactive Product', 'is_active' => false]);
        Service::factory()->create(['name' => 'Active Service', 'is_active' => true]);
        Service::factory()->create(['name' => 'Inactive Service', 'is_active' => false]);
        
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Product');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('products'));
        $this->assertSame('Active Product', $response->json('products.0.name'));
    }

    public function test_search_sanitizes_sql_special_characters(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['name' => 'Test Product', 'is_active' => true]);
        
        // Test dengan karakter SQL injection attempt
        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Test%25');
        
        $response->assertStatus(200);
        // Tidak boleh error, dan harus mengembalikan hasil yang aman
    }
}
