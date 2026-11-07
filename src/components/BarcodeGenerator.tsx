"use client";

import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, Download, Sparkles, AlertCircle } from "lucide-react";

interface BarcodeGeneratorProps {
  barcode: string;
  productName?: string;
  sellingPrice?: number;
  storeName?: string;
  onGenerateRandom?: (newCode: string) => void;
}

export default function BarcodeGenerator({
  barcode,
  productName = "Produk ATK",
  sellingPrice = 0,
  storeName = "DEVOS ATK & FOTOCOPY",
  onGenerateRandom,
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [printCopies, setPrintCopies] = useState<number>(1);

  const isBarcodeEmpty = !barcode || barcode.trim() === "";

  // Render barcode dengan JsBarcode
  useEffect(() => {
    if (!svgRef.current || isBarcodeEmpty) return;

    try {
      // Bersihkan isi SVG lama
      while (svgRef.current.firstChild) {
        svgRef.current.removeChild(svgRef.current.firstChild);
      }

      // Deteksi format: jika 12 atau 13 digit angka, gunakan EAN13 atau CODE128
      const isDigitsOnly = /^\d+$/.test(barcode);
      const format = isDigitsOnly && (barcode.length === 12 || barcode.length === 13) ? "EAN13" : "CODE128";

      JsBarcode(svgRef.current, barcode, {
        format: format === "EAN13" && barcode.length === 13 ? "EAN13" : "CODE128",
        lineColor: "#000000",
        width: 1.8,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 5,
        font: "monospace",
      });
    } catch (err: unknown) {
      console.warn("Retrying with CODE128 due to format requirement:", err);
      // Fallback ke CODE128 jika EAN checksum mismatch
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, barcode, {
            format: "CODE128",
            lineColor: "#000000",
            width: 1.8,
            height: 48,
            displayValue: true,
            fontSize: 12,
            margin: 5,
            font: "monospace",
          });
        }
      } catch (fallbackErr: unknown) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : "Format tidak didukung";
        setTimeout(() => setRenderError("Format barcode tidak valid: " + msg), 0);
      }
    }
  }, [barcode, isBarcodeEmpty]);

  // Fungsi menghasilkan barcode acak standar toko ATK (13 digit prefix 899 lokal)
  const handleGenerateRandomCode = () => {
    const random12 = "899" + Math.floor(100000000 + Math.random() * 900000000).toString();
    if (onGenerateRandom) {
      onGenerateRandom(random12);
    }
  };

  // Fungsi Cetak Label Stiker
  const handlePrintLabel = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Izinkan popup untuk mencetak label stiker.");
      return;
    }

    const svgHtml = svgRef.current ? svgRef.current.outerHTML : "";
    const formattedPrice = `Rp ${sellingPrice.toLocaleString("id-ID")}`;

    const labelsHtml = Array.from({ length: printCopies })
      .map(
        () => `
        <div class="label-card">
          <div class="store-name">${storeName}</div>
          <div class="product-name">${productName}</div>
          <div class="barcode-svg">${svgHtml}</div>
          <div class="price-tag">${formattedPrice}</div>
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Label Barcode - ${productName}</title>
          <style>
            @page {
              size: auto;
              margin: 4mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 5px;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              background: #fff;
            }
            .label-card {
              width: 190px;
              padding: 6px;
              border: 1px dashed #999;
              border-radius: 4px;
              text-align: center;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .store-name {
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #444;
            }
            .product-name {
              font-size: 10px;
              font-weight: 700;
              color: #000;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin: 2px 0;
            }
            .barcode-svg svg {
              max-width: 100%;
              height: auto;
            }
            .price-tag {
              font-size: 11px;
              font-weight: 900;
              color: #000;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Unduh Barcode sebagai SVG
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barcode-${barcode || "product"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Unduh Barcode sebagai Gambar PNG (Resolusi Tinggi)
  const handleDownloadPng = () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 3; // Skala 3x agar tajam saat dicetak/disimpan
        canvas.width = (img.width || 300) * scale;
        canvas.height = (img.height || 120) * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `barcode-${barcode || "product"}.png`;
          downloadLink.click();
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      console.error("Gagal convert PNG:", e);
      handleDownloadSvg();
    }
  };

  const displayError = isBarcodeEmpty ? "Kode barcode kosong." : renderError;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Preview Barcode & Label</h3>
          <p className="text-xs text-slate-500">Standar CODE128 / EAN13 untuk stiker rak & barang</p>
        </div>
        {onGenerateRandom && (
          <button
            type="button"
            onClick={handleGenerateRandomCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Generate Barcode
          </button>
        )}
      </div>

      {/* Tampilan Visual Kartu Label Stiker */}
      <div className="flex justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="w-64 bg-white p-3 rounded-lg border border-slate-300 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {storeName}
          </div>
          <div className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1" title={productName}>
            {productName || "Nama Produk"}
          </div>

          <div className="flex justify-center my-1 min-h-[60px] items-center">
            {displayError ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{displayError}</span>
              </div>
            ) : (
              <svg ref={svgRef} className="max-w-full" />
            )}
          </div>

          <div className="text-sm font-bold text-slate-900 mt-1">
            Rp {sellingPrice.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* Kontrol Cetak & Download */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <label htmlFor="copies" className="text-xs text-slate-800 font-bold">
            Jumlah Stiker:
          </label>
          <input
            id="copies"
            type="number"
            min={1}
            max={100}
            value={printCopies}
            onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-1.5 text-xs font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-lg text-center focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!barcode || !!displayError}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 rounded-lg transition"
            title="Unduh file gambar PNG untuk disimpan atau dimasukkan ke file"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!barcode || !!displayError}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition"
            title="Unduh file vektor SVG"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>
          <button
            type="button"
            onClick={handlePrintLabel}
            disabled={!barcode || !!displayError}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Label Stiker
          </button>
        </div>
      </div>
    </div>
  );
}
