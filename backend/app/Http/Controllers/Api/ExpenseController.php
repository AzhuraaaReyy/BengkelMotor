<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request)
    {
        $perPage = min(max($request->integer('per_page', 10), 1), 500);

        $expenses = Expense::with('createdBy:id,name')
            ->when($request->category, fn($q, $c) => $q->where('category', $c))
            ->when($request->from && $request->to, fn($q) => $q->whereBetween(DB::raw('DATE(expense_date)'), [$request->from, $request->to]))
            ->orderByDesc('expense_date')
            ->paginate($perPage);

        $total = Expense::query()
            ->when($request->from && $request->to, fn($q) => $q->whereBetween(DB::raw('DATE(expense_date)'), [$request->from, $request->to]))
            ->sum('amount');

        return response()->json(['data' => $expenses, 'meta' => ['total_amount' => $total]]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_date' => ['required', 'date'],
            'category' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $expense = Expense::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log(
            AuditLog::ACTION_EXPENSE_CREATED,
            'expense',
            $expense->id,
            null,
            ['category' => $expense->category, 'amount' => $expense->amount, 'expense_date' => $expense->expense_date]
        );

        return response()->json(['data' => $expense, 'message' => 'Pengeluaran dicatat.'], 201);
    }

    public function update(Request $request, Expense $expense)
    {
        // Expenses auto-created from a paid restock (source=STOCK_PURCHASE)
        // are locked: they mirror the stock movement, so corrections must go
        // through a new Atur Stok transaction, never a manual edit (Rules.md §9).
        if ($expense->isPurchase()) {
            return response()->json([
                'message' => 'Pengeluaran dari restock otomatis tidak dapat diedit manual. Koreksi melalui Atur Stok.',
                'code' => 'EXPENSE_LOCKED',
                'errors' => [],
            ], 403);
        }

        $validated = $request->validate([
            'expense_date' => ['sometimes', 'date'],
            'category' => ['sometimes', 'string', 'max:100'],
            'amount' => ['sometimes', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $expense->only(['expense_date', 'category', 'amount', 'description']);
        $expense->update($validated);

        $this->audit->log(
            AuditLog::ACTION_EXPENSE_UPDATED,
            'expense',
            $expense->id,
            $before,
            $expense->only(['expense_date', 'category', 'amount', 'description'])
        );

        return response()->json(['data' => $expense, 'message' => 'Pengeluaran diperbarui.']);
    }
}
