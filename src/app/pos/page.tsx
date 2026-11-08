"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Store,
  User,
  ArrowRight,
  ArrowLeft,
  X,
  LogOut,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Percent,
  Tag,
  LayoutGrid,
  BookOpen,
  Pencil,
  Ruler,
  Paperclip,
  Copy,
  Keyboard,
  Coins
} from "lucide-react";
import { printThermalReceipt } from "@/lib/receiptPrinter";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import { Camera } from "lucide-react";
import { playBeepSound, playSuccessChime } from "@/lib/sound";

interface ProductItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  sellingPrice: number;
  stock: number;
  minStock?: number;
  categoryId?: string;
  category?: {
    name: string;
  };
}

interface CategoryItem {
  id: string;
  name: string;
}

interface CartItem {
  product: ProductItem;
  qty: number;
  subtotal: number;
}

interface CompletedTransaction {
  invoiceNumber: string;
  totalAmount: number;
  cashPaid: number;
  changeDue: number;
  paymentMethod: string;
  createdAt: string;
  cashier?: {
    name: string;
  };
  items: {
    product: {
      name: string;
    };
    qty: number;
    sellingPrice: number;
    subtotal: number;
  }[];
}

interface UserSession {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "KARYAWAN";
}

interface HeldOrder {
  id: string;
  timestamp: string;
  customerNote: string;
  items: CartItem[];
  discount: number;
}

// Helper untuk ikon dan warna tema kategori riil (bukan AI generic & tidak monoton)
const getCategoryMeta = (catName?: string) => {
  const name = catName?.toLowerCase() || "";
  if (name.includes("fotocopy") || name.includes("print") || name.includes("jilid") || name.includes("laminat")) {
    return {
      icon: Printer,
      color: "text-emerald-600",
      pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
      activeTab: "bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/20",
      cardBorder: "border-t-4 border-t-emerald-500",
      accentBg: "bg-emerald-50 text-emerald-700",
      addBtn: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
    };
  }
  if (name.includes("kertas") || name.includes("buku") || name.includes("rim")) {
    return {
      icon: BookOpen,
      color: "text-amber-600",
      pill: "bg-amber-50 text-amber-800 border-amber-200",
      activeTab: "bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/20",
      cardBorder: "border-t-4 border-t-amber-500",
      accentBg: "bg-amber-50 text-amber-700",
      addBtn: "bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
    };
  }
  if (name.includes("pulpen") || name.includes("pensil") || name.includes("tipe-x") || name.includes("pen")) {
    return {
      icon: Pencil,
      color: "text-indigo-600",
      pill: "bg-indigo-50 text-indigo-800 border-indigo-200",
      activeTab: "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/20",
      cardBorder: "border-t-4 border-t-indigo-500",
      accentBg: "bg-indigo-50 text-indigo-700",
      addBtn: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
    };
  }
  if (name.includes("penggaris") || name.includes("map") || name.includes("folio")) {
    return {
      icon: Ruler,
      color: "text-purple-600",
      pill: "bg-purple-50 text-purple-800 border-purple-200",
      activeTab: "bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/20",
      cardBorder: "border-t-4 border-t-purple-500",
      accentBg: "bg-purple-50 text-purple-700",
      addBtn: "bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white",
    };
  }
  if (name.includes("aksesoris") || name.includes("perekat") || name.includes("lem") || name.includes("lakban")) {
    return {
      icon: Paperclip,
      color: "text-rose-600",
      pill: "bg-rose-50 text-rose-800 border-rose-200",
      activeTab: "bg-rose-500 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-400/20",
      cardBorder: "border-t-4 border-t-rose-500",
      accentBg: "bg-rose-50 text-rose-700",
      addBtn: "bg-rose-50 text-rose-700 group-hover:bg-rose-500 group-hover:text-white",
    };
  }
  return {
    icon: Tag,
    color: "text-slate-600",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
    activeTab: "bg-slate-900 text-white shadow-md shadow-slate-900/25",
    cardBorder: "border-t-4 border-t-slate-400",
    accentBg: "bg-slate-50 text-slate-700",
    addBtn: "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white",
  };
};

export default function PosPage() {
  const router = useRouter();

  // Data User yang sedang login
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Data Shift Kasir (Alfamart / Minimarket Shift Info)
  const [shiftInfo, setShiftInfo] = useState<{
    shift: string;
    initialCashFloat: number;
    shiftNote?: string;
    cashierName?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos_active_shift");
      if (saved) {
        try {
          setShiftInfo(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Katalog Produk & Kategori
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Keranjang belanja kasir (Sebelah Kanan)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"catalog" | "cart">("catalog");

  // Fitur Tahan Transaksi (Hold / Pending Order)
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

  // Scanner Kamera
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Notifikasi Toast
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Modal Pembayaran
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS" | "TRANSFER">("CASH");
  const [cashPaidInput, setCashPaidInput] = useState<number>(0);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Modal Struk Sukses
  const [completedTx, setCompletedTx] = useState<CompletedTransaction | null>(null);

  // Ref input scanner agar selalu auto-focus
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Buffer deteksi hardware USB Barcode Scanner (HID keyboard stream)
  const usbScanBufferRef = useRef<string>("");
  const lastScanKeyTimeRef = useRef<number>(0);
  const handleBarcodeLookupRef = useRef<((code: string) => Promise<void>) | null>(null);

  // Periksa sesi login kasir
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
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

  // Notifikasi auto-hide
  const notify = useCallback((text: string, type: "success" | "error" | "info" = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  }, []);

  // Kalkulasi Total
  const subtotalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const changeDue = Math.max(0, (cashPaidInput || 0) - totalAmount);

  // Buka Modal Pembayaran
  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) {
      notify("Keranjang belanja masih kosong!", "error");
      return;
    }
    setPaymentMethod("CASH");
    setCashPaidInput(totalAmount);
    setShowPaymentModal(true);
  }, [cart.length, totalAmount, notify]);

  // Muat produk dan kategori
  const loadCatalog = useCallback(async (query = "", catId = "") => {
    try {
      const url = `/api/pos/products?query=${encodeURIComponent(query)}&categoryId=${catId === "ALL" ? "" : catId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        if (data.categories) setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initCatalog() {
      try {
        const url = `/api/pos/products?query=&categoryId=${selectedCategory === "ALL" ? "" : selectedCategory}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore && data.success) {
          setProducts(data.products || []);
          if (data.categories) setCategories(data.categories);
          setCatalogLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setCatalogLoading(false);
      }
    }

    initCatalog();
    return () => {
      ignore = true;
    };
  }, [selectedCategory]);

  // Auto-focus scanner
  const focusScanner = useCallback(() => {
    if (!showPaymentModal && !completedTx && !showHeldOrdersModal && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showPaymentModal, completedTx, showHeldOrdersModal]);

  // Fitur Tahan Transaksi (Hold Cart)
  const handleHoldCurrentOrder = useCallback(() => {
    if (cart.length === 0) {
      notify("Keranjang masih kosong, tidak ada yang perlu ditahan.", "info");
      return;
    }

    const note = prompt("Beri catatan antrean (misal: Pelanggan Baju Biru / Pak Budi):") || `Antrean #${heldOrders.length + 1}`;
    const newHold: HeldOrder = {
      id: "HOLD-" + Date.now(),
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      customerNote: note,
      items: [...cart],
      discount: discountAmount,
    };

    setHeldOrders((prev) => [newHold, ...prev]);
    setCart([]);
    setDiscountAmount(0);
    notify(`Transaksi berhasil ditahan: "${note}". Keranjang siap untuk pelanggan berikutnya!`, "info");
    focusScanner();
  }, [cart, heldOrders.length, discountAmount, notify, focusScanner]);

  useEffect(() => {
    focusScanner();
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !showPaymentModal &&
        !completedTx &&
        !showHeldOrdersModal &&
        barcodeInputRef.current &&
        !target.closest("button") &&
        !target.closest("input") &&
        !target.closest("select")
      ) {
        barcodeInputRef.current.focus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;

      // 1. Tangani tombol fungsi F-Keys (F2, F4, F8, F9, F12) & Escape
      if (key === "F2" || code === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
        notify("Scanner Barcode Aktif (Siap Scan / Ketik)", "info");
        return;
      }
      if (key === "F4" || code === "F4") {
        e.preventDefault();
        if (cart.length > 0) {
          handleHoldCurrentOrder();
        } else if (heldOrders.length > 0) {
          setShowHeldOrdersModal(true);
        } else {
          notify("Tidak ada antrean pesanan untuk ditahan.", "info");
        }
        return;
      }
      if (key === "F8" || code === "F8") {
        e.preventDefault();
        setShowDiscountInput((prev) => !prev);
        notify("Kolom diskon dibuka di panel kasir", "info");
        return;
      }
      if (key === "F9" || code === "F9") {
        e.preventDefault();
        setShowCameraScanner((prev) => !prev);
        return;
      }
      if (key === "F12" || code === "F12") {
        e.preventDefault();
        if (cart.length > 0) {
          handleOpenPayment();
        } else {
          notify("Keranjang masih kosong! Silakan scan barang terlebih dahulu.", "info");
        }
        return;
      }
      if (key === "Escape" || code === "Escape") {
        setShowPaymentModal(false);
        setShowHeldOrdersModal(false);
        setShowCameraScanner(false);
        setCompletedTx(null);
        focusScanner();
        return;
      }

      // 2. Global Hardware USB Barcode Scanner Detection (HID Keystroke Stream)
      // Scanner USB fisik mengetik rangkaian karakter sangat cepat (< 60ms) lalu diakhiri 'Enter'.
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      // Jika bukan sedang mengetik di form modal input lain
      if (!isInput || target === barcodeInputRef.current) {
        const now = Date.now();
        const diff = now - lastScanKeyTimeRef.current;
        lastScanKeyTimeRef.current = now;

        if (key === "Enter") {
          const buffer = usbScanBufferRef.current.trim();
          if (buffer.length >= 3) {
            e.preventDefault();
            usbScanBufferRef.current = "";
            if (handleBarcodeLookupRef.current) {
              handleBarcodeLookupRef.current(buffer);
            }
            return;
          }
          usbScanBufferRef.current = "";
        } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Jika interval lebih dari 80ms, anggap manusia mengetik biasa -> reset buffer
          if (diff > 80) {
            usbScanBufferRef.current = "";
          }
          usbScanBufferRef.current += key;
        }
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusScanner, showPaymentModal, completedTx, showHeldOrdersModal, handleOpenPayment, cart.length, handleHoldCurrentOrder]);

  // Tambahkan produk ke keranjang
  const addToCart = (product: ProductItem, qtyToAdd: number = 1) => {
    if (product.stock <= 0) {
      notify(`Stok "${product.name}" habis (0)!`, "error");
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);

      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].qty;
        const newQty = currentQty + qtyToAdd;

        if (newQty > product.stock) {
          notify(`Stok produk "${product.name}" hanya tersisa ${product.stock}`, "error");
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
          subtotal: newQty * product.sellingPrice,
        };
        return updated;
      } else {
        if (qtyToAdd > product.stock) {
          notify(`Stok produk "${product.name}" hanya tersisa ${product.stock}`, "error");
          return prev;
        }

        return [
          {
            product,
            qty: qtyToAdd,
            subtotal: qtyToAdd * product.sellingPrice,
          },
          ...prev,
        ];
      }
    });

    notify(`+1 ${product.name}`, "success");
    playBeepSound();
    focusScanner();
  };

  // Update Qty produk di keranjang
  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (newQty > item.product.stock) {
            notify(`Stok maksimal tersisa: ${item.product.stock}`, "error");
            return item;
          }
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * item.product.sellingPrice,
          };
        }
        return item;
      })
    );
  };

  // Hapus item dari keranjang
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    focusScanner();
  };

  // Kosongkan keranjang
  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Apakah yakin ingin mengosongkan keranjang belanja kasir?")) {
      setCart([]);
      setDiscountAmount(0);
      notify("Keranjang belanja dikosongkan.", "info");
      focusScanner();
    }
  };

  // Handler Scan Barcode (Dipakai bersama oleh USB Scanner & Kamera)
  const handleBarcodeLookup = async (code: string) => {
    const query = code.trim();
    if (!query) return;

    try {
      const res = await fetch(`/api/pos/products?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.products && data.products.length > 0) {
        if (data.exactMatch || data.products.length === 1) {
          addToCart(data.products[0], 1);
          setBarcodeInput("");
        } else {
          setProducts(data.products);
          notify(`${data.products.length} barang cocok ditemukan`, "info");
        }
      } else {
        notify(`Barcode/kode "${query}" tidak ditemukan!`, "error");
        setBarcodeInput("");
      }
    } catch (err) {
      console.error(err);
      notify("Gagal mencari produk.", "error");
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleBarcodeLookup(barcodeInput);
  };

  handleBarcodeLookupRef.current = handleBarcodeLookup;

  // Pulihkan Transaksi yang Ditahan
  const handleRestoreHeldOrder = (order: HeldOrder) => {
    if (cart.length > 0) {
      if (!confirm("Keranjang saat ini berisi barang. Apakah ingin menimpa dengan transaksi yang dipulihkan?")) {
        return;
      }
    }

    setCart(order.items);
    setDiscountAmount(order.discount || 0);
    setHeldOrders((prev) => prev.filter((o) => o.id !== order.id));
    setShowHeldOrdersModal(false);
    notify(`Transaksi "${order.customerNote}" telah dipulihkan ke keranjang.`, "success");
    focusScanner();
  };

  // Proses Checkout Transaksi (Atomic Transaction di API)
  const handleProcessCheckout = async () => {
    if (paymentMethod === "CASH" && cashPaidInput < totalAmount) {
      notify("Uang tunai yang diterima masih kurang!", "error");
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          productId: c.product.id,
          qty: c.qty,
        })),
        cashPaid: paymentMethod === "CASH" ? cashPaidInput : totalAmount,
        paymentMethod,
        cashierId: currentUser?.id,
      };

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        notify(data.message || "Gagal menyelesaikan transaksi.", "error");
        setIsProcessingCheckout(false);
        return;
      }

      // Transaksi Berhasil!
      setCompletedTx(data.data);
      setShowPaymentModal(false);
      setCart([]);
      setDiscountAmount(0);
      setMobileActiveTab("catalog");

      // Suara transaksi sukses
      playSuccessChime();

      // Refresh katalog produk agar sisa stok ter-update langsung
      loadCatalog("", selectedCategory);

      // LANGSUNG OTOMATIS MUNCULKAN DIALOG CETAK STRUK
      setTimeout(() => {
        printThermalReceipt(data.data);
      }, 250);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal terhubung";
      console.error(err);
      notify("Terjadi kesalahan jaringan: " + errMsg, "error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem kasir?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    }
  };

  // Cetak Struk Belanja Kasir
  const handlePrintReceipt = () => {
    if (!completedTx) return;
    printThermalReceipt(completedTx);
  };

  // Pecahan uang cepat
  const quickCashOptions = [
    { label: "Uang Pas", value: totalAmount },
    { label: "Rp 10.000", value: 10000 },
    { label: "Rp 20.000", value: 20000 },
    { label: "Rp 50.000", value: 50000 },
    { label: "Rp 100.000", value: 100000 },
    { label: "Rp 200.000", value: 200000 },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden select-none">
      {/* Top Header Kasir - Bersih & Ritel Modern (Bukan AI Gemini Biru) */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src="/brand/logo-white-bg.png"
            alt="FOCUS MARAJA"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-xs shrink-0"
          />
          <div>
            <h1 className="text-sm sm:text-base font-black leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
              FOCUS MARAJA POS
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                KASIR AKTIF
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden xs:block">
              Fotokopi • ATK • Studio • Terminal Kasir #01
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs w-full sm:w-auto justify-end">
          {/* Tombol Antrean Belanja / Hold Orders */}
          {heldOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldOrdersModal(true)}
              className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold hover:bg-amber-100 transition text-[11px]"
            >
              <PauseCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{heldOrders.length} Ditahan</span>
            </button>
          )}

          {/* Shift & Kas Laci Awal Badge (Minimarket / Alfamart Style) */}
          {shiftInfo && (
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold">
              <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {shiftInfo.shift === "SHIFT_1"
                  ? "Shift 1 (Pagi)"
                  : shiftInfo.shift === "SHIFT_2"
                  ? "Shift 2 (Siang)"
                  : "Full Shift"}
              </span>
              <span className="text-emerald-300">•</span>
              <span className="text-[11px] text-emerald-700">
                Kas: Rp {shiftInfo.initialCashFloat.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-slate-800 font-bold text-xs truncate max-w-[90px] sm:max-w-[120px]">{currentUser?.name || "Kasir"}</span>
            <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold hidden sm:inline">
              {currentUser?.role || "KARYAWAN"}
            </span>
          </div>

          {/* Backoffice link jika ADMIN */}
          {currentUser?.role === "ADMIN" && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 transition font-bold"
              title="Kembali ke Backoffice Admin"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Backoffice</span>
            </a>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container 2-Column POS Layout with Responsive Mobile Switch */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* KOLOM KIRI: SCANNER, FILTER KATEGORI & GRID ETALASE BARANG */}
        <div className={`${mobileActiveTab === "catalog" ? "flex" : "hidden"} lg:flex flex-1 flex-col p-3 sm:p-4 gap-3 overflow-hidden border-r border-slate-200 bg-slate-50/50`}>
          {/* Top Bar: Barcode Scanner Input & Kamera */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs shrink-0">
            <form onSubmit={handleScanSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Gambar / Badge Scanner Kasir */}
              <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0">
                <ScanBarcode className="w-5 h-5 text-emerald-600 animate-pulse" />
                <div className="leading-tight">
                  <div className="text-[10px] font-extrabold text-emerald-900 uppercase">Scanner USB</div>
                  <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Siap Scan
                  </div>
                </div>
              </div>

              {/* Input Scan Barcode */}
              <div className="relative flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ScanBarcode className="h-5 w-5 text-emerald-600" />
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    if (e.target.value.length >= 2) {
                      loadCatalog(e.target.value, selectedCategory);
                    } else if (e.target.value === "") {
                      loadCatalog("", selectedCategory);
                    }
                  }}
                  placeholder="Scan barcode USB atau ketik nama/kode barang... (Tekan Enter)"
                  className="w-full pl-10 pr-20 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-600 rounded-xl text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                  <kbd className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                    ENTER
                  </kbd>
                </div>
              </div>

              {/* Tombol Scan Kamera Web/HP */}
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs shrink-0"
                title="Buka Scanner Barcode menggunakan Kamera Laptop / HP"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Kamera</span>
              </button>

              {/* Tombol Cari */}
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs shrink-0"
              >
                <Search className="w-4 h-4" />
                Cari
              </button>
            </form>

            {/* Notification Bar */}
            {statusMessage && (
              <div
                className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : statusMessage.type === "error"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Horizontal Category Filter Pills dengan Ikon Ritel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Semua Barang</span>
            </button>
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat.name);
              const CatIcon = meta.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? `${meta.activeTab} shadow-xs`
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : meta.color}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Product Catalog Grid (Kartu-Kartu Produk Visual dengan Ikon Ritel) */}
          <div className="flex-1 overflow-y-auto pr-1">
            {catalogLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Memuat katalog produk...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <ScanBarcode className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-600">Tidak ada barang ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau pilih kategori Semua Barang</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= (p.minStock || 5);
                  const inCartItem = cart.find((c) => c.product.id === p.id);
                  const catMeta = getCategoryMeta(p.category?.name);
                  const CatIcon = catMeta.icon;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p, 1)}
                      className={`bg-white rounded-2xl p-3.5 border transition-all duration-150 cursor-pointer flex flex-col justify-between group shadow-xs relative overflow-hidden ${catMeta.cardBorder} ${
                        isOutOfStock
                          ? "opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed"
                          : inCartItem
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md -translate-y-0.5"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      {/* Badge Jumlah di Keranjang */}
                      {inCartItem && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <span>{inCartItem.qty} pcs</span>
                        </div>
                      )}

                      <div>
                        {/* Kategori Badge dengan Ikon Khusus */}
                        <div className="flex items-center gap-1.5 text-[10px] mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black text-[10px] ${catMeta.pill}`}>
                            <CatIcon className="w-3 h-3" />
                            <span className="truncate max-w-[105px]">{p.category?.name || "ATK"}</span>
                          </span>
                        </div>

                        {/* Nama Produk */}
                        <h4
                          className="font-bold text-slate-800 text-xs md:text-sm line-clamp-2 group-hover:text-emerald-700 transition"
                          title={p.name}
                        >
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        {/* Harga */}
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Harga Satuan</div>
                          <div className="text-sm sm:text-base font-black text-slate-900 group-hover:text-emerald-700 transition">
                            Rp {p.sellingPrice.toLocaleString("id-ID")}
                          </div>
                        </div>

                        {/* Badge Stok & Quick Add Action */}
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                              Habis
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Sisa {p.stock}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {p.stock} pcs
                            </span>
                          )}

                          {!isOutOfStock && (
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 shadow-xs font-black ${catMeta.addBtn}`}>
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bilah Tombol Pintasan Cepat Kasir (Bisa Diklik & Bisa Lewat Keyboard Fisik) */}
          <div className="hidden lg:flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-2xl shadow-xs shrink-0 gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-extrabold mr-1">
              <Keyboard className="w-4 h-4 text-emerald-600" />
              <span>Pintasan:</span>
            </span>

            {/* F2: Fokus Scanner Barcode */}
            <button
              type="button"
              onClick={() => {
                if (barcodeInputRef.current) {
                  barcodeInputRef.current.focus();
                  barcodeInputRef.current.select();
                  notify("Kursor aktif di input Barcode Scanner", "info");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition active:scale-95 text-slate-700 font-bold text-xs"
              title="Klik atau tekan F2 untuk fokus scanner barcode"
            >
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-800 font-black shadow-2xs">F2</kbd>
              <span>Scan Barcode</span>
            </button>

            {/* F4: Tahan Transaksi / Buka Antrean */}
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) {
                  handleHoldCurrentOrder();
                } else if (heldOrders.length > 0) {
                  setShowHeldOrdersModal(true);
                } else {
                  notify("Keranjang kosong. Tidak ada pesanan untuk ditahan.", "info");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-300 transition active:scale-95 text-slate-700 font-bold text-xs"
              title="Klik atau tekan F4 untuk menahan transaksi atau melihat antrean"
            >
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-800 font-black shadow-2xs">F4</kbd>
              <span>Tahan Struk {heldOrders.length > 0 && `(${heldOrders.length})`}</span>
            </button>

            {/* F8: Input Diskon */}
            <button
              type="button"
              onClick={() => setShowDiscountInput((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-300 transition active:scale-95 text-slate-700 font-bold text-xs"
              title="Klik atau tekan F8 untuk membuka kolom diskon"
            >
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-800 font-black shadow-2xs">F8</kbd>
              <span>Diskon</span>
            </button>

            {/* F9: Kamera Scanner Barcode */}
            <button
              type="button"
              onClick={() => setShowCameraScanner((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 transition active:scale-95 text-slate-700 font-bold text-xs"
              title="Klik atau tekan F9 untuk membuka pemindai kamera"
            >
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-800 font-black shadow-2xs">F9</kbd>
              <span>Kamera HP</span>
            </button>

            {/* F12: Bayar Kasir */}
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) {
                  handleOpenPayment();
                } else {
                  notify("Keranjang masih kosong! Silakan scan barang atau klik produk terlebih dahulu.", "info");
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition active:scale-95 font-black text-xs shadow-sm shadow-emerald-600/25 ml-auto"
              title="Klik atau tekan F12 untuk proses pembayaran kasir"
            >
              <kbd className="px-1.5 py-0.5 bg-emerald-800/80 rounded font-mono text-[10px] text-emerald-200 font-black">F12</kbd>
              <span>Bayar Kasir</span>
            </button>
          </div>

          {/* Mobile Bottom Floating Checkout Bar (Hanya Muncul di Layar HP/Tablet) */}
          <div className="lg:hidden p-3 bg-white border border-slate-200 rounded-2xl shadow-lg flex items-center justify-between shrink-0 z-20">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 font-bold">{totalItemCount} pcs ({cart.length} item)</span>
              <span className="text-base font-black text-slate-900">Rp {totalAmount.toLocaleString("id-ID")}</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileActiveTab("cart")}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Lihat Keranjang & Bayar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: KERANJANG KASIR AKTIF & TOTAL CHECKOUT */}
        <div className={`${mobileActiveTab === "cart" ? "flex" : "hidden"} lg:flex w-full lg:w-[420px] xl:w-[460px] bg-white flex-col justify-between shrink-0 shadow-lg`}>
          {/* Header Keranjang Kasir */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* Tombol Kembali ke Katalog (Khusus Mobile/Tablet) */}
              <button
                type="button"
                onClick={() => setMobileActiveTab("catalog")}
                className="lg:hidden p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-1 text-xs font-bold transition mr-1"
                title="Kembali ke Etalase Barang"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Katalog</span>
              </button>

              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Daftar Belanja</h3>
                <span className="text-[11px] text-slate-500">
                  {cart.length} item • {totalItemCount} total pcs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Tombol Tahan Transaksi (Hold) */}
              <button
                type="button"
                onClick={handleHoldCurrentOrder}
                disabled={cart.length === 0}
                className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-30 rounded-lg transition flex items-center gap-1"
                title="Tahan transaksi pelanggan ini untuk melayani antrean lain"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tahan (Hold)</span>
              </button>

              {/* Kosongkan */}
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-lg hover:bg-rose-50 transition"
                title="Kosongkan keranjang"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Item Belanja (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <ShoppingCart className="w-16 h-16 stroke-1 text-slate-300 mb-3" />
                <p className="font-bold text-sm text-slate-700">Keranjang Masih Kosong</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Scan barcode barang atau klik kartu produk pada etalase di sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-800 truncate" title={item.product.name}>
                      {item.product.name}
                    </h5>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Rp {item.product.sellingPrice.toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Kontrol Qty */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex items-center border border-slate-300 rounded-lg bg-slate-50 overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.product.stock}
                        value={item.qty}
                        onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-12 sm:w-14 text-center text-xs font-bold text-slate-900 bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right w-20">
                      <div className="text-xs font-black text-slate-900">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel Ringkasan Total & Tombol Bayar (Bawah Kanan) */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
            {/* Kalkulasi Subtotal & Diskon */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Barang:</span>
                <span className="font-semibold text-slate-800">Rp {subtotalAmount.toLocaleString("id-ID")}</span>
              </div>

              {/* Fitur Diskon Belanja */}
              {showDiscountInput ? (
                <div className="flex items-center gap-2 pt-1">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-700">Potongan Diskon (Rp):</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotalAmount}
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Math.min(subtotalAmount, Number(e.target.value) || 0))}
                    className="w-28 px-2 py-1 text-xs font-black text-slate-950 bg-white border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(true)}
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Percent className="w-3 h-3" />
                    {discountAmount > 0 ? "Ubah Diskon" : "+ Beri Diskon / Potongan"}
                  </button>
                  {discountAmount > 0 && (
                    <span className="font-bold text-rose-600">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                  )}
                </div>
              )}
            </div>

            {/* GRAND TOTAL BESAR */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Tagihan
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  Rp {totalAmount.toLocaleString("id-ID")}
                </div>
              </div>

              {/* Tombol Bayar Sekarang */}
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) {
                    handleOpenPayment();
                  } else {
                    notify("Keranjang masih kosong! Silakan scan barang atau klik produk terlebih dahulu.", "info");
                  }
                }}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <CreditCard className="w-5 h-5" />
                <span>Bayar (F12)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL POPUP PEMBAYARAN KASIR - CLEAN LIGHT RETAIL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900">Proses Pembayaran Kasir</h3>
                <p className="text-xs text-slate-500">Pilih metode &amp; masukkan jumlah uang tunai</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-5">
              {/* Total Tagihan */}
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-900 font-bold uppercase block">Total Belanja:</span>
                  {discountAmount > 0 && (
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      (Termasuk potongan diskon Rp {discountAmount.toLocaleString("id-ID")})
                    </span>
                  )}
                </div>
                <span className="text-2xl font-black text-emerald-800">
                  Rp {totalAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Pilihan Metode Bayar */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "QRIS", "TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 text-xs font-bold rounded-lg border transition ${
                        paymentMethod === m
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m === "CASH" ? "TUNAI (CASH)" : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Tunai Khusus CASH (Kontras Tinggi & Tulisan Sangat Jelas) */}
              {paymentMethod === "CASH" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-1.5">
                      Uang Diterima dari Pelanggan (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-lg font-black text-slate-400 select-none pointer-events-none">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={cashPaidInput || ""}
                        onChange={(e) => setCashPaidInput(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-12 pr-4 py-2.5 text-2xl font-black text-slate-950 placeholder:text-slate-400 bg-white border-2 border-blue-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-xs tracking-tight"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Tombol Pecahan Uang Cepat */}
                  <div>
                    <span className="text-[11px] text-slate-600 font-bold mb-1.5 block">
                      Pecahan Uang Cepat:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {quickCashOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCashPaidInput(opt.value)}
                          className="py-2 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 border border-slate-300 text-xs font-bold rounded-lg transition shadow-2xs"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Info Kembalian */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs ${
                      cashPaidInput >= totalAmount
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                        : "bg-rose-50 border-rose-300 text-rose-950"
                    }`}
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {cashPaidInput >= totalAmount ? "Kembalian:" : "Uang Kurang:"}
                    </span>
                    <span className="text-2xl font-black">
                      Rp{" "}
                      {cashPaidInput >= totalAmount
                        ? changeDue.toLocaleString("id-ID")
                        : (totalAmount - cashPaidInput).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod !== "CASH" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
                  Pembayaran non-tunai ({paymentMethod}) terverifikasi sejumlah <b>Rp {totalAmount.toLocaleString("id-ID")}</b> (Uang pas).
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessCheckout}
                disabled={isProcessingCheckout || (paymentMethod === "CASH" && cashPaidInput < totalAmount)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2"
              >
                {isProcessingCheckout ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Selesaikan Transaksi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DAFTAR TRANSAKSI DITAHAN (HOLD ORDERS) */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Daftar Antrean Transaksi Ditahan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldOrdersModal(false)}
                className="text-amber-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {heldOrders.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Tidak ada transaksi yang ditahan.</div>
              ) : (
                heldOrders.map((order) => {
                  const holdTotal = order.items.reduce((s, i) => s + i.subtotal, 0) - order.discount;
                  return (
                    <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-slate-800">{order.customerNote}</div>
                        <div className="text-[11px] text-slate-400">
                          {order.timestamp} • {order.items.length} jenis barang
                        </div>
                        <div className="text-xs font-black text-blue-600 mt-0.5">
                          Rp {holdTotal.toLocaleString("id-ID")}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreHeldOrder(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Buka Kembali</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeldOrders((prev) => prev.filter((o) => o.id !== order.id))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Hapus antrean ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL STRUK SETELAH CHECKOUT SUKSES */}
      {completedTx && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-100 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-300 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Notifikasi Berhasil */}
            <div className="bg-emerald-600 text-white py-3 px-4 text-center flex items-center justify-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
              <span className="font-extrabold text-sm tracking-wide">
                Transaksi Berhasil & Struk Dicetak!
              </span>
            </div>

            {/* Mockup Kertas Struk Fisik Thermal */}
            <div className="p-4 flex justify-center">
              <div className="w-full bg-white p-5 rounded-2xl shadow-md border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed relative">
                {/* Efek Gerigi Kertas Kasir (Top Decorative Notch) */}
                <div className="text-center pb-2 border-b-2 border-slate-800">
                  <div className="font-black text-sm text-slate-900 tracking-wider">
                    FOCUS MARAJA
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Fotokopi • ATK • Studio
                  </div>
                  <div className="text-[10px] text-slate-500">
                    WA: 0812-3456-7890
                  </div>
                </div>

                {/* Metadata Transaksi */}
                <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No:</span>
                    <span className="font-bold text-slate-900">{completedTx.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tgl:</span>
                    <span>{new Date(completedTx.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • {new Date(completedTx.createdAt).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir:</span>
                    <span>{completedTx.cashier?.name || currentUser?.name || "Kasir"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode:</span>
                    <span className="font-bold uppercase text-blue-600">{completedTx.paymentMethod}</span>
                  </div>
                </div>

                {/* Item Pembelian */}
                <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {completedTx.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>{item.qty} x Rp {item.sellingPrice.toLocaleString("id-ID")}</span>
                        <span className="font-bold text-slate-900">Rp {item.subtotal.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kalkulasi Total */}
                <div className="py-2.5 border-b-2 border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-black text-slate-900">
                    <span>TOTAL:</span>
                    <span>Rp {completedTx.totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-[10.5px] text-slate-700">
                    <span>BAYAR:</span>
                    <span className="font-bold">Rp {completedTx.cashPaid.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-[10.5px] text-slate-700">
                    <span>KEMBALIAN:</span>
                    <span className="font-extrabold text-emerald-600">Rp {completedTx.changeDue.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {/* Footer Struk */}
                <div className="pt-3 text-center text-[9.5px] text-slate-400 leading-tight">
                  Terima kasih atas kunjungan Anda!<br />
                  Barang yang sudah dibeli<br />
                  tidak dapat ditukar/dikembalikan.
                </div>
              </div>
            </div>

            {/* Tombol Aksi Kasir */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Ulang Struk</span>
              </button>

              <button
                type="button"
                autoFocus
                onClick={() => {
                  setCompletedTx(null);
                  focusScanner();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>Transaksi Baru (Enter)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCANNER BARCODE MENGGUNAKAN KAMERA */}
      <CameraBarcodeScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={(decodedText) => {
          handleBarcodeLookup(decodedText);
          setShowCameraScanner(false);
        }}
      />
    </div>
  );
}
