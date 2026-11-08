"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import BarcodeGenerator from "@/components/BarcodeGenerator";
import {
  Package,
  Plus,
  AlertTriangle,
  Boxes,
  DollarSign,
  Printer,
  CheckCircle2,
  X,
  Search,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  FileText,
  LogOut,
  User,
  Users,
  Edit,
  Trash2,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Coins
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { exportTransactionsToExcel, TransactionReportData } from "@/lib/exportExcel";
import { exportTransactionsToPdf } from "@/lib/exportPdf";
import { printShiftZReport, ShiftReportData } from "@/lib/receiptPrinter";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "KARYAWAN";
  createdAt: string;
  _count?: {
    transactions: number;
  };
}

interface Stats {
  totalProducts: number;
  totalAssetValue: number;
  lowStockCount: number;
}

interface ReportData {
  daily: {
    revenue: number;
    cost: number;
    profit: number;
    transactionCount: number;
    soldItems: { name: string; qty: number; subtotal: number }[];
  };
  rangeSummary: {
    revenue: number;
    cost: number;
    profit: number;
    transactionCount: number;
    aov: number;
    marginPercent: string;
  };
  bestSellers: { name: string; qty: number; totalSales: number }[];
  categoryBreakdown: { name: string; revenue: number; qty: number }[];
  paymentMethods: { method: string; total: number }[];
  chartTrend: { date: string; omzet: number; laba: number; transaksi: number }[];
  transactions: {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    cashPaid: number;
    totalAmount: number;
    totalCost: number;
    paymentMethod: string;
    cashier: { name: string };
    items: { product: { name: string }; qty: number; sellingPrice: number; subtotal: number }[];
  }[];
}

interface UserSession {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "KARYAWAN";
}

const PIE_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0891b2"];

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Tab Menu: 'inventory' | 'reports' | 'users' | 'shifts'
  const [activeTab, setActiveTab] = useState<"inventory" | "reports" | "users" | "shifts">("inventory");
  const [reportSubTab, setReportSubTab] = useState<"daily" | "monthly" | "yearly">("daily");

  // State Riwayat Shift Kasir
  const [shifts, setShifts] = useState<ShiftReportData[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);

  // State Produk & Kategori
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalAssetValue: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter & Sorting Tabel Produk
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Pagination & Pilihan Berapa Data yang Ditampilkan
  const [pageSize, setPageSize] = useState<number | "ALL">(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State Manajemen User
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "KARYAWAN" as "ADMIN" | "KARYAWAN",
  });
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUserFormData, setEditUserFormData] = useState({
    name: "",
    role: "KARYAWAN" as "ADMIN" | "KARYAWAN",
    password: "",
  });

  // State Laporan
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Modal Tambah Barang Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 10,
    minStock: 5,
    barcode: "",
    sku: "",
  });

  // Modal Edit Barang
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    categoryId: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minStock: 5,
    barcode: "",
    sku: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal Restock Cepat
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [isRestocking, setIsRestocking] = useState(false);

  // Modal Cetak Label Barcode Spesifik
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);

  // Periksa autentikasi Admin
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.role !== "ADMIN") {
            router.push("/pos?denied=admin_only");
            return;
          }
          setCurrentUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkAuth();
  }, [router]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const res = await fetch("/api/admin/shifts");
      const data = await res.json();
      if (data.success && data.data) {
        setShifts(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async (start = startDate, end = endDate) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  }, [startDate, endDate]);

  // Quick Preset Date Ranges
  const handleQuickPreset = (preset: "today" | "7days" | "30days" | "thisMonth") => {
    const today = new Date();
    const endStr = today.toISOString().slice(0, 10);
    let startStr = endStr;

    if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      startStr = d.toISOString().slice(0, 10);
    } else if (preset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      startStr = d.toISOString().slice(0, 10);
    } else if (preset === "thisMonth") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      startStr = d.toISOString().slice(0, 10);
    }

    setStartDate(startStr);
    setEndDate(endStr);
    fetchReports(startStr, endStr);
  };

  useEffect(() => {
    let ignore = false;
    async function initData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/products"),
        ]);
        const catData = await catRes.json();
        const prodData = await prodRes.json();
        if (!ignore) {
          if (catData.success) {
            setCategories(catData.categories);
            if (catData.categories.length > 0) {
              setFormData((prev) => ({ ...prev, categoryId: catData.categories[0].id }));
            }
          }
          if (prodData.success) {
            setProducts(prodData.products);
            setStats(prodData.stats);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setLoading(false);
      }
    }

    initData();
    return () => {
      ignore = true;
    };
  }, []);

  // Handler Logout
  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari Backoffice Admin?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    }
  };

  // Buka Modal Tambah Barang
  const handleOpenAddModal = () => {
    const autoBarcode = "899" + Math.floor(100000000 + Math.random() * 900000000).toString();
    setFormData({
      name: "",
      categoryId: categories[0]?.id || "",
      costPrice: 0,
      sellingPrice: 0,
      stock: 10,
      minStock: 5,
      barcode: autoBarcode,
      sku: "",
    });
    setShowAddModal(true);
  };

  // Simpan Master Produk Baru
  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama barang wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAlertMsg({ text: data.message || "Gagal menambahkan produk.", type: "error" });
        return;
      }

      setAlertMsg({ text: `Produk "${formData.name}" berhasil ditambahkan!`, type: "success" });
      setShowAddModal(false);
      fetchProducts();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setAlertMsg({ text: "Gagal: " + msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Buka Modal Edit Produk
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name,
      categoryId: p.categoryId,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock,
      minStock: p.minStock,
      barcode: p.barcode,
      sku: p.sku,
    });
  };

  // Simpan Update Produk
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAlertMsg({ text: data.message || "Gagal memperbarui produk.", type: "error" });
        return;
      }

      setAlertMsg({ text: `Perubahan produk "${editFormData.name}" berhasil disimpan!`, type: "success" });
      setEditingProduct(null);
      fetchProducts();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setAlertMsg({ text: "Gagal: " + msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Hapus Produk
  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus produk.");
        return;
      }

      setAlertMsg({ text: data.message || "Produk berhasil dihapus.", type: "success" });
      fetchProducts();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menghapus produk.");
    }
  };

  // Restock Produk
  const handleExecuteRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    setIsRestocking(true);
    try {
      const res = await fetch(`/api/admin/products/${restockProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockToAdd: restockQty }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menambah stok.");
        return;
      }

      setAlertMsg({
        text: `Restock berhasil! Stok "${restockProduct.name}" bertambah +${restockQty} pcs.`,
        type: "success",
      });
      setRestockProduct(null);
      fetchProducts();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat restock.");
    } finally {
      setIsRestocking(false);
    }
  };

  // Tambah User Karyawan / Admin Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal membuat user.");
        return;
      }

      setAlertMsg({ text: data.message, type: "success" });
      setShowAddUserModal(false);
      setUserFormData({ name: "", username: "", password: "", role: "KARYAWAN" });
      fetchUsers();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      alert("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserFormData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal memperbarui user.");
        return;
      }

      setAlertMsg({ text: data.message, type: "success" });
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      alert("Gagal memperbarui user.");
    } finally {
      setSubmitting(false);
    }
  };

  // Hapus User
  const handleDeleteUser = async (u: UserAccount) => {
    if (!confirm(`Apakah yakin ingin menghapus akun "${u.name}" (${u.username})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus user.");
        return;
      }

      setAlertMsg({ text: data.message, type: "success" });
      fetchUsers();
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    }
  };

  // Export Laporan ke Excel
  const handleExportExcel = async () => {
    if (!reportData || reportData.transactions.length === 0) {
      alert("Tidak ada data transaksi untuk diexport.");
      return;
    }

    const formattedList: TransactionReportData[] = reportData.transactions.map((tx) => ({
      invoiceNumber: tx.invoiceNumber,
      createdAt: tx.createdAt,
      cashierName: tx.cashier.name,
      paymentMethod: tx.paymentMethod,
      totalAmount: tx.totalAmount,
      totalCost: tx.totalCost,
      grossProfit: tx.totalAmount - tx.totalCost,
      itemCount: tx.items.reduce((s, i) => s + i.qty, 0),
    }));

    await exportTransactionsToExcel(formattedList, `${startDate} s/d ${endDate}`);
  };

  // Export Laporan ke PDF Resmi A4
  const handleExportPdf = () => {
    if (!reportData || reportData.transactions.length === 0) {
      alert("Tidak ada data transaksi untuk dicetak.");
      return;
    }

    const formattedList: TransactionReportData[] = reportData.transactions.map((tx) => ({
      invoiceNumber: tx.invoiceNumber,
      createdAt: tx.createdAt,
      cashierName: tx.cashier.name,
      paymentMethod: tx.paymentMethod,
      totalAmount: tx.totalAmount,
      totalCost: tx.totalCost,
      grossProfit: tx.totalAmount - tx.totalCost,
      itemCount: tx.items.reduce((s, i) => s + i.qty, 0),
    }));

    exportTransactionsToPdf(formattedList, `${startDate} s/d ${endDate}`);
  };

  // Filter & Sort Produk
  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === "ALL" || p.categoryId === filterCategory;
      const matchLowStock = !filterLowStockOnly || p.stock <= p.minStock;
      return matchSearch && matchCat && matchLowStock;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "stock-desc") return b.stock - a.stock;
      if (sortBy === "price-desc") return b.sellingPrice - a.sellingPrice;
      if (sortBy === "price-asc") return a.sellingPrice - b.sellingPrice;
      return 0;
    });

  // Kalkulasi Pagination & Baris Data
  const totalItems = filteredProducts.length;
  const pageSizeNumber = pageSize === "ALL" ? (totalItems || 1) : pageSize;
  const totalPages = pageSize === "ALL" || totalItems === 0 ? 1 : Math.ceil(totalItems / pageSizeNumber);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const startIndex = pageSize === "ALL" ? 0 : (safeCurrentPage - 1) * pageSizeNumber;
  const endIndex = pageSize === "ALL" ? totalItems : startIndex + pageSizeNumber;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar Admin - Bersih & Ritel Modern */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo-white-bg.png"
            alt="FOCUS MARAJA"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-xs shrink-0"
          />
          <div>
            <h1 className="text-sm sm:text-base font-black leading-tight text-slate-900 flex items-center gap-2">
              FOCUS MARAJA BACKOFFICE
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                PORTAL PEMILIK
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Fotokopi • ATK • Studio • Inventaris &amp; Laporan</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-sm w-full sm:w-auto justify-end">
          {/* Akun Admin Login */}
          <div className="flex items-center gap-2 bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200">
            <User className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="text-slate-800 font-bold text-xs truncate max-w-[120px]">{currentUser?.name || "Owner Toko"}</span>
            <span className="text-[9px] sm:text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">
              ADMIN
            </span>
          </div>

          {/* Tombol ke Layar Kasir */}
          <a
            href="/pos"
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-3.5 py-1.5 rounded-xl font-bold transition shadow-xs whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Layar Kasir (POS)</span>
            <span className="sm:hidden">Kasir</span>
          </a>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-200 transition font-bold whitespace-nowrap"
            title="Keluar dari akun admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shadow-xs sticky top-[57px] sm:top-[61px] z-30 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${
              activeTab === "inventory"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Manajemen Stok & Master Barang</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("reports");
              fetchReports();
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Laporan Penjualan & Statistik Laba</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("users");
              fetchUsers();
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kelola Karyawan & Role (RBAC)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("shifts");
              fetchShifts();
            }}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${
              activeTab === "shifts"
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Rekap Tutup Shift Kasir (Z-Report)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 flex-1">
        {/* Toast Notifikasi */}
        {alertMsg && (
          <div
            className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200 ${
              alertMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {alertMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{alertMsg.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MANAJEMEN INVENTARIS & MASTER BARANG                              */}
        {/* ========================================================================= */}
        {activeTab === "inventory" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Dashboard Cards Statistik Inventaris */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
              <div
                onClick={() => {
                  setFilterLowStockOnly(false);
                  setCurrentPage(1);
                }}
                className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition ${
                  !filterLowStockOnly ? "bg-gradient-to-br from-white to-blue-50/40 border-blue-200/80" : "bg-white/60 border-slate-200 hover:border-blue-300"
                }`}
                title="Semua Produk Aktif"
              >
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Jenis Produk
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalProducts} Item</div>
                  <span className="text-xs text-blue-700 font-semibold">Aktif di etalase toko</span>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                  <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nilai Aset Modal Toko
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                    Rp {stats.totalAssetValue.toLocaleString("id-ID")}
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold">Total HPP seluruh stok fisik</span>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div
                onClick={() => {
                  setFilterLowStockOnly((prev) => !prev);
                  setCurrentPage(1);
                }}
                className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition ${
                  filterLowStockOnly
                    ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300"
                    : "bg-white border-slate-200 hover:border-rose-300"
                }`}
                title="Klik untuk memfilter daftar barang yang stoknya kritis"
              >
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    Peringatan Stok Kritis
                    {filterLowStockOnly && (
                      <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold">
                        DIFILTER
                      </span>
                    )}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{stats.lowStockCount} Produk</div>
                  <span className="text-xs text-rose-600 font-bold">
                    {filterLowStockOnly ? "Klik untuk reset filter" : "Klik untuk filter stok kritis"}
                  </span>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>

            {/* Tabel Master Data Barang & Kontrol Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">Master Data Inventaris ATK</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Input produk baru, generate barcode, edit data, dan pantau stok realtime
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                  {/* Filter Kategori */}
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Filter Sorting A-Z */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="name-asc">Urutan: Nama (A - Z)</option>
                    <option value="name-desc">Urutan: Nama (Z - A)</option>
                    <option value="stock-asc">Urutan: Stok Terendah</option>
                    <option value="stock-desc">Urutan: Stok Tertinggi</option>
                    <option value="price-desc">Urutan: Harga Tertinggi</option>
                    <option value="price-asc">Urutan: Harga Terendah</option>
                  </select>

                  {/* Pilihan Berapa Data yang Ditampilkan (Page Size) */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 rounded-xl shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tampilkan:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                        setPageSize(val);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                      title="Pilih jumlah baris produk yang ditampilkan"
                    >
                      <option value={10}>10 Baris</option>
                      <option value={15}>15 Baris</option>
                      <option value={25}>25 Baris</option>
                      <option value={50}>50 Baris</option>
                      <option value={100}>100 Baris</option>
                      <option value="ALL">Semua Data</option>
                    </select>
                  </div>

                  {/* Search Input dengan Kontras Jelas */}
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari nama / barcode / SKU..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 w-full sm:w-48 md:w-56 shadow-2xs"
                    />
                  </div>

                  {/* Tombol Tambah Barang Baru */}
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Barang Baru</span>
                  </button>
                </div>
              </div>

              {/* Tabel Produk dengan Internal Scrollbar & Sticky Header */}
              <div className="overflow-x-auto max-h-[530px] overflow-y-auto rounded-xl border border-slate-200 relative shadow-2xs">
                {loading ? (
                  <div className="p-10 text-center text-slate-600 font-bold text-sm">Memuat data produk...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 font-medium text-sm">
                    Tidak ada produk yang cocok dengan pencarian / filter.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider sticky top-0 z-10 shadow-xs border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px] bg-slate-100">Nama Produk</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px] bg-slate-100">Kategori</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px] bg-slate-100">Barcode</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px] bg-slate-100">Harga Modal (HPP)</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px] bg-slate-100">Harga Jual</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px] bg-slate-100">Margin / Pcs</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[120px] bg-slate-100">Sisa Stok</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[200px] bg-slate-100">Aksi Manajemen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {paginatedProducts.map((p) => {
                        const margin = p.sellingPrice - p.costPrice;
                        const isLowStock = p.stock <= p.minStock;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono font-semibold">SKU: {p.sku}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-block bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-md text-xs border border-slate-300 shadow-2xs">
                                {p.category.name}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedProductForBarcode(p)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 transition border border-slate-300 font-mono font-bold text-xs group shadow-2xs"
                                title="Klik untuk lihat gambar barcode & unduh PNG / cetak stiker"
                              >
                                <QrCode className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
                                <span>{p.barcode}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700 font-semibold whitespace-nowrap">
                              Rp {p.costPrice.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                              Rp {p.sellingPrice.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                              +Rp {margin.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`px-3 py-1 rounded-full font-black text-xs inline-flex items-center justify-center border shadow-2xs ${
                                  isLowStock
                                    ? "bg-rose-100 text-rose-900 border-rose-300 animate-pulse"
                                    : "bg-emerald-100 text-emerald-950 border-emerald-300"
                                }`}
                              >
                                {p.stock} pcs
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Tombol Restock */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRestockProduct(p);
                                    setRestockQty(10);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-200"
                                  title="Tambah Stok Masuk"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Restock</span>
                                </button>

                                {/* Tombol Edit Barang */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-200"
                                  title="Edit Informasi Barang & Harga"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {/* Tombol Cetak Barcode */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedProductForBarcode(p)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 font-bold border border-blue-200"
                                  title="Preview & Cetak Barcode Stiker"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Barcode</span>
                                </button>

                                {/* Tombol Hapus Barang */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                                  title="Hapus Produk"
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
                )}
              </div>

              {/* Status Bar Tabel & Pagination Navigasi (Pilihan Berapa Data Muncul) */}
              <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 font-semibold flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-center md:text-left">
                  <span>
                    Menampilkan <b>{totalItems === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, totalItems)}</b> dari total <b>{totalItems}</b> produk
                    {pageSize !== "ALL" && totalPages > 1 && ` • Halaman ${safeCurrentPage} dari ${totalPages}`}
                  </span>
                  {filterLowStockOnly && (
                    <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                      Filter Stok Kritis
                    </span>
                  )}
                </div>

                {/* Kontrol Navigasi Halaman (Pagination Buttons) */}
                {pageSize !== "ALL" && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs transition ${
                          safeCurrentPage === pageNum
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  {/* Selector Pilihan Baris di Footer */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Data:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                        setPageSize(val);
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs focus:outline-none"
                    >
                      <option value={10}>10 Baris</option>
                      <option value={15}>15 Baris</option>
                      <option value={25}>25 Baris</option>
                      <option value={50}>50 Baris</option>
                      <option value={100}>100 Baris</option>
                      <option value="ALL">Semua Data</option>
                    </select>
                  </div>

                  <span>
                    Total Aset: <b className="text-emerald-700">Rp {stats.totalAssetValue.toLocaleString("id-ID")}</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LAPORAN PENJUALAN BERTINGKAT & STATISTIK VISUAL                     */}
        {/* ========================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filter Rentang Tanggal, Quick Preset & Tombol Export (Fully Responsive HP/Tablet/Desktop) */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Pilihan Tingkatan Laporan */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setReportSubTab("daily")}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                      reportSubTab === "daily" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportSubTab("monthly")}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                      reportSubTab === "monthly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportSubTab("yearly")}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                      reportSubTab === "yearly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tahunan
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("today")}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center shadow-2xs"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("7days")}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center shadow-2xs"
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("30days")}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center shadow-2xs"
                  >
                    30 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("thisMonth")}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center shadow-2xs"
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>

              {/* Form Filter Tanggal & Export */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-slate-600 shrink-0 w-8 sm:w-auto">Dari:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-slate-300 text-slate-900 font-bold rounded-xl text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-slate-600 shrink-0 w-8 sm:w-auto">s/d:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-slate-300 text-slate-900 font-bold rounded-xl text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchReports()}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 text-center"
                  >
                    Terapkan
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Metrik Ringkasan Finansial 6-Grid Modern */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {reportSubTab === "daily" ? "Omzet Hari Ini" : "Total Omzet"}
                </span>
                <div className="text-base sm:text-xl font-black text-blue-600 mt-1 truncate">
                  Rp{" "}
                  {(reportSubTab === "daily"
                    ? reportData?.daily.revenue || 0
                    : reportData?.rangeSummary.revenue || 0
                  ).toLocaleString("id-ID")}
                </div>
                <span className="text-[10px] text-slate-400">Total kotor</span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {reportSubTab === "daily" ? "HPP Hari Ini" : "Total Modal (HPP)"}
                </span>
                <div className="text-base sm:text-xl font-black text-slate-800 mt-1 truncate">
                  Rp{" "}
                  {(reportSubTab === "daily"
                    ? reportData?.daily.cost || 0
                    : reportData?.rangeSummary.cost || 0
                  ).toLocaleString("id-ID")}
                </div>
                <span className="text-[10px] text-slate-400">Modal pokok</span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {reportSubTab === "daily" ? "Laba Bersih Hari Ini" : "Keuntungan Bersih"}
                </span>
                <div className="text-base sm:text-xl font-black text-emerald-600 mt-1 truncate">
                  Rp{" "}
                  {(reportSubTab === "daily"
                    ? reportData?.daily.profit || 0
                    : reportData?.rangeSummary.profit || 0
                  ).toLocaleString("id-ID")}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-3 h-3" /> Laba Kotor Toko
                </span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Jumlah Transaksi
                </span>
                <div className="text-base sm:text-xl font-black text-slate-900 mt-1 truncate">
                  {(reportSubTab === "daily"
                    ? reportData?.daily.transactionCount || 0
                    : reportData?.rangeSummary.transactionCount || 0)}{" "}
                  Struk
                </div>
                <span className="text-[10px] text-slate-400">Struk tercetak</span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Rata-rata Transaksi (AOV)
                </span>
                <div className="text-base sm:text-xl font-black text-purple-600 mt-1 truncate">
                  Rp {(reportData?.rangeSummary.aov || 0).toLocaleString("id-ID")}
                </div>
                <span className="text-[10px] text-slate-400">Omzet / Struk</span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Margin Laba (%)
                </span>
                <div className="text-base sm:text-xl font-black text-emerald-700 mt-1 truncate">
                  {reportData?.rangeSummary.marginPercent || "0"}%
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Rasio Keuntungan</span>
              </div>
            </div>

            {/* DUA GRAFIK MODERN: Composed Bar + Area Chart & Donut Chart Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Grafik Batang & Tren Laba Penjualan (8 Kolom) */}
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Grafik Penjualan Ritel & Margin Laba
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Perbandingan Omzet (Bar Chart) dan Keuntungan Bersih (Smooth Curve Line)
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                    Recharts Analytics
                  </span>
                </div>

                <div className="h-80 w-full pt-2">
                  {reportLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm font-bold">
                      Memuat grafik analitik...
                    </div>
                  ) : !reportData || reportData.chartTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                      Belum ada data transaksi pada rentang tanggal ini.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={reportData.chartTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barOmzetGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                          </linearGradient>
                          <linearGradient id="areaLabaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                        <Tooltip
                          formatter={(val: unknown) => `Rp ${Number(val).toLocaleString("id-ID")}`}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            color: "#ffffff",
                            borderRadius: "12px",
                            border: "none",
                            padding: "10px 14px",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "12px", fontWeight: 700 }} />
                        <Bar
                          dataKey="omzet"
                          name="Omzet Total (Rp)"
                          fill="url(#barOmzetGrad)"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Area
                          type="monotone"
                          dataKey="laba"
                          name="Laba Kotor"
                          stroke="#059669"
                          strokeWidth={3}
                          fill="url(#areaLabaGrad)"
                        />
                        <Line
                          type="monotone"
                          dataKey="laba"
                          name="Keuntungan Bersih"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#10b981" }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Grafik Donut / Pie Kategori Breakdown (4 Kolom) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PieIcon className="w-4 h-4 text-purple-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Porsi Omzet per Kategori</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Kategori produk penyumbang omzet terbesar</p>
                </div>

                <div className="h-56 w-full flex items-center justify-center my-2">
                  {!reportData || reportData.categoryBreakdown.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center font-medium">Belum ada penjualan.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.categoryBreakdown}
                          dataKey="revenue"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {reportData.categoryBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: unknown) => `Rp ${Number(val).toLocaleString("id-ID")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Legend Kategori */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto pr-1">
                  {reportData?.categoryBreakdown.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-700 truncate">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        Rp {cat.revenue.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Produk Terlaris (Best Seller) & Riwayat Transaksi */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Produk Terlaris (5 Kolom) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm">Produk Terlaris (Best Seller)</h3>
                  <span className="text-xs text-slate-500 font-semibold">Paling banyak terjual</span>
                </div>

                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto mt-2">
                  {!reportData || reportData.bestSellers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">Belum ada data barang terjual.</div>
                  ) : (
                    reportData.bestSellers.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              idx === 0
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : idx === 1
                                ? "bg-slate-200 text-slate-700"
                                : idx === 2
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Total Nilai: Rp {item.totalSales.toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg text-xs border border-blue-200">
                          {item.qty} pcs
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rincian Transaksi Terakhir (7 Kolom) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm">Daftar Transaksi Kasir</h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {reportData?.transactions.length || 0} transaksi tercatat
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[380px] overflow-y-auto flex-1 mt-2 rounded-xl border border-slate-200 relative shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 uppercase font-extrabold sticky top-0 z-10 shadow-xs border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100">Invoice</th>
                        <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100">Waktu</th>
                        <th className="py-2.5 px-3 whitespace-nowrap bg-slate-100">Kasir</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100">Total</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100">Laba</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {!reportData || reportData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                            Tidak ada data transaksi.
                          </td>
                        </tr>
                      ) : (
                        reportData.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {tx.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                              })}{" "}
                              {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-semibold whitespace-nowrap">{tx.cashier.name}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                              Rp {tx.totalAmount.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              +Rp {(tx.totalAmount - tx.totalCost).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: KELOLA KARYAWAN & ROLE PENGGUNA (USER RBAC MANAGEMENT)            */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">Kelola Akun Karyawan & Hak Akses</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Atur hak akses kasir penjualan vs pemilik toko (Owner Admin), reset password, dan pantau aktivitas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Karyawan / Admin Baru</span>
              </button>
            </div>

            {/* Tabel Daftar Pengguna */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto relative rounded-xl">
                {usersLoading ? (
                  <div className="p-10 text-center text-slate-600 font-bold text-sm">Memuat data pengguna...</div>
                ) : users.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">Belum ada user.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider sticky top-0 z-10 shadow-xs border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap bg-slate-100 min-w-[180px]">Nama Lengkap</th>
                        <th className="py-3.5 px-4 whitespace-nowrap bg-slate-100 min-w-[140px]">Username Login</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-100 min-w-[140px]">Peran (Role)</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-100 min-w-[140px]">Total Transaksi Dilayani</th>
                        <th className="py-3.5 px-4 whitespace-nowrap bg-slate-100 min-w-[130px]">Tanggal Dibuat</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-100 min-w-[120px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {users.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">
                              {u.name} {isSelf && <span className="text-[10px] text-blue-600 font-bold ml-1">(Anda)</span>}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">@{u.username}</td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full font-black text-[11px] border shadow-2xs ${
                                  u.role === "ADMIN"
                                    ? "bg-purple-100 text-purple-900 border-purple-200"
                                    : "bg-blue-100 text-blue-900 border-blue-200"
                                }`}
                              >
                                {u.role === "ADMIN" ? "ADMIN (OWNER)" : "KARYAWAN (KASIR)"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-900 whitespace-nowrap">
                              {u._count?.transactions || 0} struk
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                              {new Date(u.createdAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserFormData({
                                      name: u.name,
                                      role: u.role,
                                      password: "",
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-200"
                                  title="Edit Nama / Password / Role"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                                    title="Hapus Akun Pengguna"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-semibold flex items-center justify-between">
                <span>Total <b>{users.length}</b> akun terdaftar dalam sistem</span>
                <span>Role-Based Access Control Aktif</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT TUTUP SHIFT KASIR (Z-REPORT) */}
        {activeTab === "shifts" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  Rekap Tutup Kasir &amp; Laci Uang (Shift)
                </h3>
                <p className="text-xs text-slate-500">
                  Audit pencocokan uang tunai fisik laci kasir vs omzet penjualan sistem (Laporan Z-Report)
                </p>
              </div>

              <button
                type="button"
                onClick={fetchShifts}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <span>Muat Ulang Shift</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                {shiftsLoading ? (
                  <div className="py-16 text-center text-xs text-slate-400">Memuat riwayat shift kasir...</div>
                ) : shifts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    Belum ada riwayat shift yang tersimpan.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-4">Waktu Buka / Tutup</th>
                        <th className="py-3 px-4">Kasir</th>
                        <th className="py-3 px-4">Shift</th>
                        <th className="py-3 px-4 text-right">Modal Awal</th>
                        <th className="py-3 px-4 text-right">Penjualan Tunai</th>
                        <th className="py-3 px-4 text-right">Penjualan QRIS</th>
                        <th className="py-3 px-4 text-right">Uang Fisik Laci</th>
                        <th className="py-3 px-4 text-center">Selisih</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Cetak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {shifts.map((s) => {
                        const expected = (s.openingFloat || 0) + (s.totalCashSales || 0);
                        const actual = s.closingCash ?? expected;
                        const diff = actual - expected;
                        const isClosed = s.status === "CLOSED";

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">
                                {new Date(s.openedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {new Date(s.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                {s.closedAt && ` – ${new Date(s.closedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                              </div>
                            </td>

                            <td className="py-3 px-4 font-bold text-slate-800">
                              {s.cashierName}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
                                {s.shiftType === "SHIFT_1"
                                  ? "Shift 1 (Pagi)"
                                  : s.shiftType === "SHIFT_2"
                                  ? "Shift 2 (Siang)"
                                  : "Full Day"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right font-medium text-slate-700">
                              Rp {s.openingFloat.toLocaleString("id-ID")}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-emerald-700">
                              Rp {s.totalCashSales.toLocaleString("id-ID")}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-indigo-700">
                              Rp {s.totalQrisSales.toLocaleString("id-ID")}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              {s.closingCash != null ? `Rp ${s.closingCash.toLocaleString("id-ID")}` : "–"}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {s.closingCash == null ? (
                                <span className="text-[10px] text-slate-400 font-semibold">Sedang Aktif</span>
                              ) : diff === 0 ? (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  PAS (Rp 0)
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                  +Rp {diff.toLocaleString("id-ID")}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  -Rp {Math.abs(diff).toLocaleString("id-ID")}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isClosed
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-emerald-100 text-emerald-800 animate-pulse"
                                }`}
                              >
                                {isClosed ? "DITUTUP" : "AKTIF"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isClosed ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    printShiftZReport({
                                      id: s.id,
                                      cashierName: s.cashierName,
                                      shiftType: s.shiftType,
                                      openedAt: s.openedAt,
                                      closedAt: s.closedAt || new Date().toISOString(),
                                      openingFloat: s.openingFloat,
                                      totalCashSales: s.totalCashSales,
                                      totalQrisSales: s.totalQrisSales,
                                      totalTransactions: s.totalTransactions,
                                      expectedCash: expected,
                                      closingCash: s.closingCash || 0,
                                      discrepancy: diff,
                                      notes: s.notes,
                                    })
                                  }
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                  title="Cetak Ulang Struk Rekap Shift (Z-Report)"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300">–</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH MASTER BARANG BARU (DENGAN INPUT KONTRAS TEGAS)            */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Tambah Master Barang Baru</h3>
                <p className="text-xs text-slate-300">Input informasi produk & auto-generate barcode toko</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama Produk */}
                <div className="md:col-span-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Nama Barang / ATK *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pensil 2B Faber-Castell Hijau"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>


                {/* Harga Beli Modal (HPP) */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Harga Modal / Beli (HPP) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.costPrice || ""}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 3500"
                    className="w-full px-3.5 py-2.5 text-sm font-extrabold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Harga Jual */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Harga Jual Pelanggan *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.sellingPrice || ""}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 5000"
                    className="w-full px-3.5 py-2.5 text-sm font-extrabold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Stok Awal */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Minimal Stok Alert */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Batas Alert Stok Menipis
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Barcode Generator Terintegrasi */}
              <div className="pt-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2">
                  Sistem Barcode & Cetak Label
                </label>
                <BarcodeGenerator
                  barcode={formData.barcode}
                  productName={formData.name || "Nama Barang Baru"}
                  sellingPrice={formData.sellingPrice || 0}
                  onGenerateRandom={(newCode) => setFormData((prev) => ({ ...prev, barcode: newCode }))}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {submitting ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PRODUK LENGKAP                                              */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Edit Master Barang</h3>
                <p className="text-xs text-amber-100">Perbarui nama, kategori, harga, atau stok barang</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-amber-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">SKU Sistem:</span>
                    <span className="font-mono font-black text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                      {editingProduct.sku}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Terkunci otomatis (Aman untuk barcode stiker)</span>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Nama Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Kategori *
                  </label>
                  <select
                    value={editFormData.categoryId}
                    onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Kode Barcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.barcode}
                    onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Harga Modal / Beli (HPP) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormData.costPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Harga Jual Pelanggan *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormData.sellingPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Sisa Stok Fisik
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editFormData.stock}
                    onChange={(e) => setEditFormData({ ...editFormData, stock: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    Batas Alert Stok Kritis
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.minStock}
                    onChange={(e) => setEditFormData({ ...editFormData, minStock: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 text-sm font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH USER KARYAWAN / ADMIN BARU                                */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Tambah Akun Pengguna Baru</h3>
                <p className="text-xs text-blue-100">Buat akun untuk kasir atau admin tambahan</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-blue-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahma (Kasir Pagi)"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: siti"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Peran (Role) *
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as "ADMIN" | "KARYAWAN" })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  <option value="KARYAWAN">KARYAWAN (Hanya Layar Kasir POS)</option>
                  <option value="ADMIN">ADMIN (Akses Penuh Backoffice & Kasir)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {submitting ? "Menyimpan..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT USER & ROLE                                                 */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Edit User @{editingUser.username}</h3>
                <p className="text-xs text-slate-300">Ubah nama, peran, atau reset password</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editUserFormData.name}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Peran (Role) *
                </label>
                <select
                  value={editUserFormData.role}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, role: e.target.value as "ADMIN" | "KARYAWAN" })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  <option value="KARYAWAN">KARYAWAN (Hanya Layar Kasir POS)</option>
                  <option value="ADMIN">ADMIN (Akses Penuh Backoffice & Kasir)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                  Reset Password Baru (Kosongkan jika tidak diubah)
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password baru..."
                  value={editUserFormData.password}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESTOCK STOK MASUK                                               */}
      {/* ========================================================================= */}
      {restockProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Restock Barang Masuk</h3>
                <p className="text-xs text-emerald-100">{restockProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockProduct(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRestock} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-700 font-bold">Stok Fisik Saat Ini:</span>
                <span className="font-black text-slate-900 text-base">{restockProduct.stock} pcs</span>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Jumlah Stok Masuk (+ pcs) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 text-xl font-black text-slate-900 border-2 border-slate-300 focus:border-emerald-600 rounded-xl focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="text-xs font-semibold text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                Stok setelah restock: <b>{restockProduct.stock + restockQty} pcs</b>.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {isRestocking ? "Menyimpan..." : "Konfirmasi Tambah Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CETAK ULANG LABEL BARCODE SPESIFIK                               */}
      {/* ========================================================================= */}
      {selectedProductForBarcode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm">Cetak Stiker Barcode Produk</h3>
                <p className="text-xs text-slate-300">{selectedProductForBarcode.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForBarcode(null)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <BarcodeGenerator
                barcode={selectedProductForBarcode.barcode}
                productName={selectedProductForBarcode.name}
                sellingPrice={selectedProductForBarcode.sellingPrice}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
