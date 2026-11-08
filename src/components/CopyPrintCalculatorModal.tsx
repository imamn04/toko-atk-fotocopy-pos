"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Copy,
  Layers,
  BookOpen,
  Sparkles,
  Plus,
  Calculator,
  Check
} from "lucide-react";

interface ServicePreset {
  id: string;
  name: string;
  unitPrice: number;
  category: "fotocopy" | "print";
}

interface CopyPrintCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: {
    product: {
      id: string;
      sku: string;
      barcode: string;
      name: string;
      sellingPrice: number;
      stock: number;
      category?: { name: string };
    };
    qty: number;
    subtotal: number;
  }) => void;
  existingProducts: Array<{
    id: string;
    sku: string;
    barcode: string;
    name: string;
    sellingPrice: number;
    stock: number;
  }>;
}

const PRESETS: ServicePreset[] = [
  { id: "fc-a4", name: "Fotocopy HVS A4 (B/W)", unitPrice: 300, category: "fotocopy" },
  { id: "fc-f4", name: "Fotocopy HVS F4 (B/W)", unitPrice: 350, category: "fotocopy" },
  { id: "pr-bw", name: "Print Hitam Putih A4", unitPrice: 500, category: "print" },
  { id: "pr-col", name: "Print Warna A4", unitPrice: 1500, category: "print" },
];

export default function CopyPrintCalculatorModal({
  isOpen,
  onClose,
  onAddToCart,
  existingProducts,
}: CopyPrintCalculatorModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("fc-a4");
  const [originalSheets, setOriginalSheets] = useState<number>(1);
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [isDuplex, setIsDuplex] = useState<boolean>(false); // Bolak-balik
  const [bindingType, setBindingType] = useState<"none" | "mika" | "spiral">("none");
  const [laminatingSheets, setLaminatingSheets] = useState<number>(0);

  if (!isOpen) return null;

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  // Hitung jumlah lembar total
  const totalSheets = Math.max(1, originalSheets) * Math.max(1, copiesCount);

  // Harga per lembar dasar (jika bolak-balik: 1 lembar kertas memuat 2 halaman, harga = unitPrice * 1.8 atau sesuai tarif)
  const effectiveSheetPrice = isDuplex ? Math.round(activePreset.unitPrice * 1.8) : activePreset.unitPrice;
  const paperCost = totalSheets * effectiveSheetPrice;

  // Biaya Jilid per rangkap/buku
  const bindingUnitPrice = bindingType === "mika" ? 4000 : bindingType === "spiral" ? 8000 : 0;
  const totalBindingCost = bindingUnitPrice * Math.max(1, copiesCount);

  // Biaya Laminating
  const totalLaminatingCost = Math.max(0, laminatingSheets) * 5000;

  // Grand Total
  const grandTotal = paperCost + (bindingType !== "none" ? totalBindingCost : 0) + totalLaminatingCost;

  const handleAdd = () => {
    // Cari produk terdekat di database master barang
    const matchedProduct =
      existingProducts.find((p) => p.name.toLowerCase().includes(activePreset.name.toLowerCase())) ||
      existingProducts[0];

    const description = `${activePreset.name} (${originalSheets} lbr x ${copiesCount} rkp${
      isDuplex ? ", 2-sisi" : ""
    }${bindingType === "mika" ? " + Jilid Mika" : bindingType === "spiral" ? " + Jilid Spiral" : ""}${
      laminatingSheets > 0 ? ` + Lam ${laminatingSheets} lbr` : ""
    })`;

    onAddToCart({
      product: {
        id: matchedProduct?.id || `calc-${Date.now()}`,
        sku: matchedProduct?.sku || "SVC-CP",
        barcode: matchedProduct?.barcode || "SVC-CP",
        name: description,
        sellingPrice: grandTotal,
        stock: 99999,
        category: { name: "Jasa Fotocopy & Print" },
      },
      qty: 1,
      subtotal: grandTotal,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">Kalkulator Jasa Fotokopi &amp; Print</h3>
              <p className="text-xs text-emerald-100">Hitung otomatis lembar, rangkap, jilid &amp; laminating</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Pilih Jenis Layanan */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              1. Pilih Layanan Jasa
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const isSelected = p.id === selectedPresetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPresetId(p.id)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 font-bold"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="text-xs truncate">{p.name}</div>
                    <div className="text-sm font-black text-emerald-700 mt-1">
                      Rp {p.unitPrice.toLocaleString("id-ID")} <span className="text-[10px] text-slate-400 font-normal">/ lbr</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Lembar Asli & Rangkap */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Jml Lembar Asli (Master):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={originalSheets || ""}
                  onChange={(e) => setOriginalSheets(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-center font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Jml Rangkap / Copy:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={copiesCount || ""}
                  onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-center font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
              <span className="text-slate-500 font-semibold">Total Lembar Kertas:</span>
              <span className="font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                {totalSheets} Lembar
              </span>
            </div>
          </div>

          {/* 3. Opsi Sisi: 1 Sisi vs Bolak-Balik */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              2. Sisi Cetak
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDuplex(false)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  !isDuplex
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                1 Sisi (Single Sided)
              </button>
              <button
                type="button"
                onClick={() => setIsDuplex(true)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  isDuplex
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                2 Sisi (Bolak-Balik)
              </button>
            </div>
          </div>

          {/* 4. Tambahan Jilid & Finishing */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              3. Tambahan Jilid Buku ({copiesCount} Buku)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBindingType("none")}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border text-center transition ${
                  bindingType === "none"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Tanpa Jilid
              </button>
              <button
                type="button"
                onClick={() => setBindingType("mika")}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border text-center transition ${
                  bindingType === "mika"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div>Mika &amp; Lakban</div>
                <div className="text-[10px] opacity-80">+Rp 4.000/buku</div>
              </button>
              <button
                type="button"
                onClick={() => setBindingType("spiral")}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border text-center transition ${
                  bindingType === "spiral"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div>Spiral Plastik</div>
                <div className="text-[10px] opacity-80">+Rp 8.000/buku</div>
              </button>
            </div>
          </div>

          {/* 5. Tambahan Laminating */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Laminating Panas A4/F4</span>
              <span className="text-[10px] text-slate-500">+Rp 5.000 per lembar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Lembar:</span>
              <input
                type="number"
                min={0}
                value={laminatingSheets || ""}
                placeholder="0"
                onChange={(e) => setLaminatingSheets(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Ringkasan Total Live */}
          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Biaya Cetak/Kopi ({totalSheets} lbr):</span>
              <span className="font-bold text-slate-800">Rp {paperCost.toLocaleString("id-ID")}</span>
            </div>
            {bindingType !== "none" && (
              <div className="flex justify-between text-slate-600">
                <span>Biaya Jilid ({copiesCount} buku):</span>
                <span className="font-bold text-slate-800">Rp {totalBindingCost.toLocaleString("id-ID")}</span>
              </div>
            )}
            {laminatingSheets > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Biaya Laminating ({laminatingSheets} lbr):</span>
                <span className="font-bold text-slate-800">Rp {totalLaminatingCost.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-sm">
              <span className="font-black text-emerald-950">TOTAL BIAYA:</span>
              <span className="text-xl font-black text-emerald-700">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Masukkan ke Keranjang (Rp {grandTotal.toLocaleString("id-ID")})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
