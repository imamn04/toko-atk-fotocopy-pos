"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  RefreshCw,
  X,
  Layers,
  AlertCircle,
  CheckCircle2,
  Barcode as BarcodeIcon,
  Tag
} from "lucide-react";
import BarcodeGenerator from "@/components/BarcodeGenerator";

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  barcode: string;
}

interface BundleItemDetail {
  id: string;
  productId: string;
  qty: number;
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    costPrice: number;
    stock: number;
    barcode: string;
  };
}

interface Bundle {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  description?: string | null;
  isActive: boolean;
  items: BundleItemDetail[];
  createdAt: string;
}

export default function BundleManagerTab() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Buat Bundling
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBundleForPrint, setSelectedBundleForPrint] = useState<Bundle | null>(null);

  // Form State
  const [bundleName, setBundleName] = useState("");
  const [bundleBarcode, setBundleBarcode] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [bundleDesc, setBundleDesc] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ productId: string; qty: number }[]>([
    { productId: "", qty: 1 },
  ]);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBundles, resProducts] = await Promise.all([
        fetch("/api/admin/bundles"),
        fetch("/api/admin/products"),
      ]);

      const dataBundles = await resBundles.json();
      const dataProducts = await resProducts.json();

      if (dataBundles.success) setBundles(dataBundles.data || []);
      if (dataProducts.success) setAllProducts(dataProducts.products || dataProducts.data || []);
    } catch {
      setToast({ type: "error", text: "Gagal memuat data paket bundling." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateRandomBarcode = () => {
    const randomCode = "BND" + Math.floor(10000000 + Math.random() * 90000000).toString();
    setBundleBarcode(randomCode);
  };

  const handleAddItemRow = () => {
    setSelectedItems((prev) => [...prev, { productId: "", qty: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "qty", value: any) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Hitung total harga normal eceran untuk barang penyusun
  const calculatedNormalTotal = selectedItems.reduce((acc, it) => {
    const prod = allProducts.find((p) => p.id === it.productId);
    return acc + (prod ? prod.sellingPrice * (it.qty || 1) : 0);
  }, 0);

  const promoPriceNumber = Number(bundlePrice) || 0;
  const hematAmount = Math.max(0, calculatedNormalTotal - promoPriceNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundleName.trim() || !bundlePrice || promoPriceNumber <= 0) {
      alert("Harap lengkapi nama paket dan harga promo.");
      return;
    }

    const validItems = selectedItems.filter((i) => i.productId && i.qty > 0);
    if (validItems.length === 0) {
      alert("Harap pilih minimal 1 barang penyusun paket.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bundleName.trim(),
          barcode: bundleBarcode.trim() || undefined,
          price: promoPriceNumber,
          description: bundleDesc.trim() || undefined,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setBundleName("");
        setBundleBarcode("");
        setBundlePrice("");
        setBundleDesc("");
        setSelectedItems([{ productId: "", qty: 1 }]);
        setToast({ type: "success", text: "Paket bundling promo berhasil dibuat!" });
        setTimeout(() => setToast(null), 3500);
        fetchData();
      } else {
        alert(json.message || "Gagal membuat paket bundling.");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat membuat paket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus paket bundling promo ini?")) return;
    try {
      const res = await fetch(`/api/admin/bundles/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "success", text: "Paket bundling berhasil dihapus." });
        setTimeout(() => setToast(null), 3000);
        fetchData();
      } else {
        alert(json.message || "Gagal menghapus paket.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    }
  };

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

      {/* Header Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Paket Bundling Promo & Barcode Fisik</span>
          </h2>
          <p className="text-xs text-slate-500">
            Gabungkan beberapa ATK dengan harga diskon promo, buat barcode fisik khusus, dan potong stok otomatis saat di-scan kasir.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              handleGenerateRandomBarcode();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Promo Baru</span>
          </button>
        </div>
      </div>

      {/* Grid of Bundles */}
      {bundles.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-slate-700">Belum Ada Paket Bundling Promo</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Buat paket promo seperti &quot;Paket Ujian Sekolah&quot; (Pensil + Penghapus + Penggaris) dengan satu barcode khusus untuk ditempel pada kemasan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bundles.map((bundle) => {
            // Kalkulasi stok efektif paket berdasarkan komponen terkecil
            const bottleneckStock =
              bundle.items.length === 0
                ? 0
                : Math.min(...bundle.items.map((it) => Math.floor(it.product.stock / it.qty)));

            const totalNormalPrice = bundle.items.reduce(
              (acc, it) => acc + it.product.sellingPrice * it.qty,
              0
            );
            const hemat = Math.max(0, totalNormalPrice - bundle.price);

            return (
              <div
                key={bundle.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1">
                        {bundle.sku}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 leading-snug">{bundle.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(bundle.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Paket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {bundle.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{bundle.description}</p>
                  )}

                  {/* Komponen Barang Penyusun */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1.5">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Isi Komponen Paket ({bundle.items.length} Barang):
                    </p>
                    <ul className="space-y-1">
                      {bundle.items.map((it) => (
                        <li key={it.id} className="text-xs text-slate-700 flex items-center justify-between">
                          <span className="truncate pr-2">
                            • {it.qty}x {it.product.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            (Stok: {it.product.stock})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing & Stock Status */}
                  <div className="flex items-end justify-between pt-1">
                    <div>
                      {hemat > 0 && (
                        <p className="text-[11px] text-slate-400 line-through">
                          Rp {totalNormalPrice.toLocaleString("id-ID")}
                        </p>
                      )}
                      <p className="text-lg font-black text-indigo-600">
                        Rp {bundle.price.toLocaleString("id-ID")}
                      </p>
                      {hemat > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Hemat Rp {hemat.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Bisa Dirakit</span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full inline-block ${
                          bottleneckStock > 2
                            ? "bg-emerald-100 text-emerald-800"
                            : bottleneckStock > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {bottleneckStock} Paket
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Barcode & Cetak Button */}
                <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700">
                    <BarcodeIcon className="w-4 h-4 text-slate-400" />
                    <span>{bundle.barcode}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBundleForPrint(bundle)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-extrabold rounded-xl transition shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cetak Label Barcode</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: BUAT PAKET BUNDLING PROMO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Buat Paket Bundling Promo</h3>
                <p className="text-xs text-indigo-100">Gabungkan beberapa ATK dengan satu barcode kemasan promo</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Nama Paket Promo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Paket Siswa Hemat (1 Pack Buku + 1 Pack Pulpen)"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Barcode Khusus Paket *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BND89901234"
                      value={bundleBarcode}
                      onChange={(e) => setBundleBarcode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRandomBarcode}
                      className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold transition flex items-center gap-1 shrink-0"
                      title="Generate Barcode Baru"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Acak</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Harga Promo Paket (Rp) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Contoh: 35000"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
                    Keterangan Promo (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Khusus tahun ajaran baru sekolah"
                    value={bundleDesc}
                    onChange={(e) => setBundleDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Items Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Barang-Barang Penyusun Paket *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Barang</span>
                  </button>
                </div>

                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                        required
                      >
                        <option value="" className="text-slate-500">-- Pilih Barang ATK --</option>
                        {allProducts.map((p) => (
                          <option key={p.id} value={p.id} className="text-slate-900 font-bold">
                            {p.name} (Sisa Stok: {p.stock} | Rp {p.sellingPrice.toLocaleString("id-ID")})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, "qty", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold text-slate-900 text-center bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                          title="Jumlah item dalam paket"
                        />
                        <span className="text-xs text-slate-700 font-bold">pcs</span>
                      </div>

                      {selectedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                          title="Hapus baris"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Summary Normal vs Promo */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Total Harga Normal Satuan:{" "}
                      <strong className="text-slate-900 font-bold">
                        Rp {calculatedNormalTotal.toLocaleString("id-ID")}
                      </strong>
                    </span>
                    {hematAmount > 0 && (
                      <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Pelanggan Hemat: Rp {hematAmount.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
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
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-indigo-500/25 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan Paket..." : "Simpan Paket Bundling"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CETAK BARCODE BUNDLE */}
      {selectedBundleForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Cetak Barcode Paket Promo</h3>
                <p className="text-xs text-slate-500">{selectedBundleForPrint.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBundleForPrint(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <BarcodeGenerator
              barcode={selectedBundleForPrint.barcode}
              productName={`[PROMO] ${selectedBundleForPrint.name}`}
              sellingPrice={selectedBundleForPrint.price}
              storeName="FOCUS MARAJA"
            />

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBundleForPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

