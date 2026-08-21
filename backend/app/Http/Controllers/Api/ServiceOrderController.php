<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ServiceOrder;
use App\Services\Audit\AuditService;
use App\Support\CodeGenerator;
use Illuminate\Http\Request;

class ServiceOrderController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request)
    {
        $orders = ServiceOrder::with([
            'customer:id,name',
            'mechanic:id,name',
            'sale:id,status,sale_code',
        ])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->mechanic_id, fn($q, $id) => $q->where('mechanic_id', $id))
            ->when($request->search, function ($q, $s) {
                $q->where(function ($qq) use ($s) {
                    $qq->where('order_code', 'like', "%{$s}%")
                        ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$s}%"));
                });
            })
            ->when($request->from && $request->to, fn($q) => $q->whereBetween('opened_at', [$request->from, $request->to]))
            ->orderByDesc('opened_at')
            ->paginate(15);

        return response()->json(['data' => $orders]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'motorcycle_type' => ['nullable', 'string', 'max:100'],
            'mechanic_id' => ['nullable', 'exists:mechanics,id'],
            'complaint' => ['required', 'string'],
            'diagnosis_note' => ['nullable', 'string'],
            // Hanya ada dua status yang dipakai di UI: "Baru" (OPEN) untuk
            // order baru dan "Selesai" (DONE) yang otomatis tercapai saat
            // transaksinya dibayar. Order baru tidak pernah dibuat langsung
            // dalam status lain.
            'status' => ['nullable', 'in:OPEN'],
            'opened_at' => ['nullable', 'date'],
        ]);

        $order = ServiceOrder::create([
            'order_code' => CodeGenerator::orderCode(),
            'customer_id' => $validated['customer_id'],
            'motorcycle_type' => $validated['motorcycle_type'] ?? null,
            'cashier_id' => $request->user()->id,
            'mechanic_id' => $validated['mechanic_id'] ?? null,
            'complaint' => $validated['complaint'],
            'diagnosis_note' => $validated['diagnosis_note'] ?? null,
            // Default "Baru": kasir tidak perlu mengatur status; order baru
            // dicatat saat motor diterima dan otomatis menjadi "Selesai" (DONE)
            // ketika transaksi POS yang ditautkan dibayar.
            'status' => $validated['status'] ?? ServiceOrder::STATUS_OPEN,
            'opened_at' => $validated['opened_at'] ?? now(),
            'completed_at' => null,
        ]);

        $order->load(['customer:id,name', 'mechanic:id,name']);
        return response()->json(['data' => $order, 'message' => 'Order servis dibuat.'], 201);
    }

    public function show(ServiceOrder $serviceOrder)
    {
        $serviceOrder->load(['customer', 'mechanic', 'cashier:id,name', 'sale:id,sale_code,status,grand_total,paid_at']);
        return response()->json(['data' => $serviceOrder]);
    }

    public function update(Request $request, ServiceOrder $serviceOrder)
    {
        // DONE/CANCELLED are terminal states. DONE is only ever set
        // automatically by CheckoutSaleService when the linked sale is paid;
        // once an order reaches either terminal state it becomes immutable,
        // mirroring the PAID-sale immutability rule elsewhere in the system.
        if (in_array($serviceOrder->status, [ServiceOrder::STATUS_DONE, ServiceOrder::STATUS_CANCELLED], true)) {
            return response()->json([
                'message' => 'Order servis yang sudah selesai atau dibatalkan tidak dapat diubah lagi.',
                'code' => 'SERVICE_ORDER_LOCKED',
                'errors' => [],
            ], 409);
        }

        $validated = $request->validate([
            'motorcycle_type' => ['nullable', 'string', 'max:100'],
            'mechanic_id' => ['nullable', 'exists:mechanics,id'],
            'complaint' => ['sometimes', 'string'],
            'diagnosis_note' => ['nullable', 'string'],
            // DONE is set automatically at checkout, not chosen manually here.
            'status' => ['sometimes', 'in:OPEN,IN_PROGRESS,CANCELLED'],
        ]);

        $serviceOrder->update($validated);
        $serviceOrder->load(['customer:id,name', 'mechanic:id,name']);
        return response()->json(['data' => $serviceOrder, 'message' => 'Order servis diperbarui.']);
    }

    public function destroy(Request $request, ServiceOrder $serviceOrder)
    {
        // Deleting an order is allowed in every status. If the order backs a
        // transaction, the sale/receipt stays intact — we only unlink it
        // (service_order_id -> null) so financial records are never orphaned.
        $hasSale = $serviceOrder->sale()->exists();
        $orderCode = $serviceOrder->order_code;
        $status = $serviceOrder->status;

        if ($hasSale) {
            $serviceOrder->sale()->update(['service_order_id' => null]);
        }

        $serviceOrder->delete();

        $this->audit->log(
            AuditLog::ACTION_SERVICE_ORDER_DELETED,
            'service_order',
            $serviceOrder->id,
            null,
            [
                'order_code' => $orderCode,
                'status' => $status,
                'sale_unlinked' => $hasSale,
            ],
            null,
            $request->user()->id
        );

        return response()->json(['message' => 'Order servis dihapus.']);
    }
}
