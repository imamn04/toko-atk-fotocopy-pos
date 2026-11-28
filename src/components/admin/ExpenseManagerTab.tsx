"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  RefreshCw,
  ShoppingBag,
  Zap,
  Wrench,
  Users,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Edit,
  AlertTriangle
} from "lucide-react";

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recordedBy?: string | null;
  createdAt: string;
}

interface ExpenseSummary {
  month: string;
  totalExpenses: number;
  byCategory: Record<string, number>;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  KULAKAN_STOK: { label: "Kulakan Stok ATK / Kertas", color: "bg-blue-100 text-blue-800 border-blue-200", icon: ShoppingBag },
  LISTRIK_AIR: { label: "Listrik, Air & Wifi", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Zap },
  SERVIS_MESIN: { label: "Servis Mesin Fotokopi & Tinta", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Wrench },
  OPERASIONAL: { label: "Operasional & Perlengkapan", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Wallet },
  GAJI: { label: "Gaji & Uang Makan Karyawan", color: "bg-rose-100 text-rose-800 border-rose-200", icon: Users },
  LAINNYA: { label: "Lain-Lain", color: "bg-slate-100 text-slate-800 border-slate-200", icon: DollarSign },
};

export default function ExpenseManagerTab() {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    month: currentMonthStr,
    totalExpenses: 0,
    byCategory: {},
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "KULAKAN_STOK",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // State Edit Pengeluaran
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    category: "KULAKAN_STOK",
    description: "",
    amount: "",
    date: "",
  });

  // State Reset Seluruh Data Pengeluaran Uji Coba
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [resetting, setResetting] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/expenses?month=${selectedMonth}${
        selectedCategory !== "ALL" ? `&category=${selectedCategory}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const rawList = Array.isArray(json.data)
          ? json.data
          : (json.data?.expenses || json.expenses || []);

        const total = typeof json.totalAmount === "number"
          ? json.totalAmount
          : (json.data?.summary?.totalExpenses ?? rawList.reduce((acc: number, item: ExpenseItem) => acc + (item.amount || 0), 0));

        const byCat = json.categorySummary || json.data?.summary?.byCategory || {};

        setExpenses(rawList);
        setSummary({
          month: selectedMonth,
          totalExpenses: total,
          byCategory: byCat,
        });
      }
    } catch {
      setToast({ type: "error", text: "Gagal memuat daftar pengeluaran." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || Number(formData.amount) <= 0) {
      alert("Harap isi deskripsi dan nominal pengeluaran yang valid.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.category,
          description: formData.description,
          amount: Number(formData.amount),
          date: formData.date,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setFormData({
          category: "KULAKAN_STOK",
          description: "",
          amount: "",
          date: new Date().toISOString().slice(0, 10),
        });
        setToast({ type: "success", text: "Pengeluaran berhasil dicatat!" });
        setTimeout(() => setToast(null), 3000);
        fetchExpenses();
      } else {
        alert(json.message || "Gagal mencatat pengeluaran.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch(`/api/admin/expenses?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "success", text: "Catatan pengeluaran berhasil dihapus." });
        setTimeout(() => setToast(null), 3000);
        fetchExpenses();
      } else {
        alert(json.message || "Gagal menghapus.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleOpenEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setEditFormData({
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      date: new Date(exp.date).toISOString().slice(0, 10),
    });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editFormData.description || !editFormData.amount || Number(editFormData.amount) <= 0) {
      alert("Harap isi deskripsi dan nominal pengeluaran yang valid.");
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch("/api/admin/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          category: editFormData.category,
          description: editFormData.description,
          amount: Number(editFormData.amount),
          date: editFormData.date,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingExpense(null);
        setToast({ type: "success", text: "Catatan pengeluaran berhasil diperbarui!" });
        setTimeout(() => setToast(null), 3000);
        fetchExpenses();
      } else {
        alert(json.message || "Gagal memperbarui pengeluaran.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setUpdating(false);
    }
  };

  const handleExecuteReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== "RESET") {
      alert('Mohon ketik kata "RESET" dengan tepat untuk mengonfirmasi.');
      return;
    }

    try {
      setResetting(true);
      const res = await fetch("/api/admin/expenses?all=true", {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setShowResetModal(false);
        setResetConfirmInput("");
        setToast({ type: "success", text: "Seluruh data pengeluaran uji coba berhasil dibersihkan!" });
        setTimeout(() => setToast(null), 4000);
        fetchExpenses();
      } else {
        alert(json.message || "Gagal mereset pengeluaran.");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat mereset.");
    } finally {
      setResetting(false);
    }
  };

  const kulakanTotal = (summary?.byCategory && summary.byCategory["KULAKAN_STOK"]) || 0;
  const operasionalTotal = (summary?.totalExpenses || 0) - kulakanTotal;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-xs ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Actions & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-600" />
            <span>Buku Pengeluaran & Belanja Toko</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan operational expense, kulakan stok ATK/kertas, utilitas, dan servis mesin fotokopi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Bulan */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Reset Data Percobaan */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl transition shadow-2xs active:scale-95 cursor-pointer"
            title="Bersihkan catatan pengeluaran uji coba toko"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Data Pengeluaran</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-sm shadow-rose-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Total Pengeluaran ({selectedMonth})
            </p>
            <p className="text-2xl font-black text-rose-600">
              Rp {summary.totalExpenses.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Kulakan Stok ATK & Kertas
            </p>
            <p className="text-2xl font-black text-blue-600">
              Rp {kulakanTotal.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Operasional & Servis Mesin
            </p>
            <p className="text-2xl font-black text-amber-600">
              Rp {operasionalTotal.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table of Expenses */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Rincian Pengeluaran ({expenses.length} Transaksi)
          </span>
          <button
            type="button"
            onClick={fetchExpenses}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Belum ada catatan pengeluaran di bulan {selectedMonth}.</p>
            <p className="text-xs mt-1">Klik tombol &quot;Catat Pengeluaran&quot; untuk menambahkan belanja toko.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Keterangan / Keperluan</th>
                  <th className="py-3 px-4">Dicatat Oleh</th>
                  <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {expenses.map((exp) => {
                  const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP.LAINNYA;
                  const dateFormatted = new Date(exp.date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">{dateFormatted}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catInfo.color}`}
                        >
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{exp.description}</td>
                      <td className="py-3 px-4 text-slate-500">{exp.recordedBy || "-"}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        Rp {exp.amount.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition border border-amber-200 bg-amber-50 cursor-pointer"
                            title="Edit Catatan Pengeluaran"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition border border-rose-200 bg-rose-50 cursor-pointer"
                            title="Hapus Catatan Pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Pengeluaran Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Catat Pengeluaran Baru</h3>
                <p className="text-xs text-rose-100">Pencatatan belanja kulakan stok & biaya operasional toko</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                    <option key={key} value={key} className="text-slate-900 font-bold">
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                  Keterangan / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kulakan Kertas HVS 5 Dus dari Supplier"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Contoh: 850000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-black text-rose-700 placeholder:text-rose-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Tanggal Pengeluaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-rose-500/25 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Catatan Pengeluaran */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Edit Catatan Pengeluaran</h3>
                <p className="text-xs text-amber-100">Koreksi nominal, kategori, atau tanggal nota belanja</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                    <option key={key} value={key} className="text-slate-900 font-bold">
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                  Keterangan / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kertas HVS 5 Rim, Tinta Fotokopi, Token Listrik..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
                >
                  {updating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Data Pengeluaran Uji Coba */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Reset Data Pengeluaran Toko
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bersihkan seluruh catatan belanja operasional demo agar buku kas dimulai dari Rp 0 saat buka resmi.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-xs text-rose-950 space-y-2">
              <p className="font-black text-rose-900">⚠️ Perhatian Khusus:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>Seluruh catatan belanja/pengeluaran toko akan <b>dihapus bersih</b>.</li>
                <li>Total pengeluaran bulanan akan kembali menjadi <b>Rp 0</b>.</li>
                <li><b>Master barang, kategori, dan akun kasir TETAP AMAN.</b></li>
              </ul>
            </div>

            <div className="space-y-2 mb-5">
              <label className="text-xs font-bold text-slate-700 block">
                Ketik kata <span className="font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">RESET</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                placeholder='Ketik "RESET"'
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-slate-300 font-black text-slate-900 text-sm rounded-xl focus:outline-none focus:border-rose-500 uppercase tracking-widest text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={resetting}
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmInput("");
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetting || resetConfirmInput.trim().toUpperCase() !== "RESET"}
                onClick={handleExecuteReset}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{resetting ? "Sedang Menghapus..." : "Ya, Hapus & Reset Pengeluaran"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

