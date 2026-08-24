<?php

namespace Tests\Feature\Services;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_paginates_ten_per_page_by_default_and_honors_per_page(): void
    {
        $admin = User::factory()->admin()->create();
        Service::factory()->count(12)->create();

        $default = $this->actingAs($admin)->getJson('/api/v1/services');
        $default->assertStatus(200);
        $this->assertCount(10, $default->json('data.data'));
        $this->assertSame(2, $default->json('data.last_page'));

        $custom = $this->actingAs($admin)->getJson('/api/v1/services?per_page=5');
        $custom->assertStatus(200);
        $this->assertCount(5, $custom->json('data.data'));
        $this->assertSame(5, $custom->json('data.per_page'));
    }

    public function test_all_flag_returns_full_catalog_for_pos(): void
    {
        $cashier = User::factory()->cashier()->create();
        Service::factory()->count(12)->create();

        $response = $this->actingAs($cashier)->getJson('/api/v1/services?per_page=200&all=1');

        $response->assertStatus(200);
        $this->assertCount(12, $response->json('data.data'));
    }
}