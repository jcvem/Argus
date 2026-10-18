"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Lock,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Download,
  Search,
} from "lucide-react";

interface GuardedDocumentPreviewProps {
  filename?: string;
  sourceDigest?: string;
  policyApplied?: string;
  reductionLatency?: string;
  previewUrl?: string;
  previewText?: string;
  isImagePreview?: boolean;
}

export function GuardedDocumentPreview({
  filename = "Sep_Sells_Marketing_AVA.xls",
  sourceDigest = "e3b0c442...98f1",
  policyApplied = "sales-quarterly v1.0.0",
  reductionLatency = "63ms",
  previewUrl,
  previewText,
  isImagePreview,
}: GuardedDocumentPreviewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"spreadsheet" | "pdf" | "split">("split");


  // Sample spreadsheet rows with deterministic redactions
  const spreadsheetRows = [
    { id: "#2026-0901", date: "09/01/2026", product: "Cloud Sub", qty: 1, unit: "$120.00", total: "$120.00", status: "Paid" },
    { id: "#2026-0902", date: "09/02/2026", product: "Cloud Sub", qty: 1, unit: "$120.00", total: "$120.00", status: "Paid" },
    { id: "#2026-0903", date: "09/02/2026", product: "Hardware Upgrade", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Pending" },
    { id: "#2026-0904", date: "09/02/2026", product: "Hardware Upgrade", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Pending" },
    { id: "#2026-0905", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Paid" },
    { id: "#2026-0906", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Refunded" },
    { id: "#2026-0907", date: "09/02/2026", product: "Hardware Upgrade", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Pending" },
    { id: "#2026-0908", date: "09/02/2026", product: "Support Plan", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Shipped" },
    { id: "#2026-0909", date: "09/02/2026", product: "Support Plan", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Shipped" },
    { id: "#2026-0910", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Paid" },
    { id: "#2026-0911", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Paid" },
    { id: "#2026-0912", date: "09/02/2026", product: "Cloud Sub", qty: 1, unit: "$120.00", total: "$120.00", status: "Paid" },
    { id: "#2026-0913", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Pending" },
    { id: "#2026-0914", date: "09/02/2026", product: "Hardware Upgrade", qty: 5, unit: "$350.00", total: "$1,750.00", status: "Refunded" },
    { id: "#2026-0915", date: "09/02/2026", product: "Consultation", qty: 2, unit: "$45.00", total: "$90.00", status: "Paid" },
  ];

  // PDF report rows
  const pdfRows = [
    { inv: "#INV-09-001", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "Visa", status: "Completed" },
    { inv: "#INV-09-002", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "Visa", status: "Completed" },
    { inv: "#INV-09-003", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Wireless Desk Set", qty: 12, price: "120.00", grand: "12.50", method: "Visa", status: "Completed" },
    { inv: "#INV-09-004", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "Visa", status: "Processing" },
    { inv: "#INV-09-005", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "ACH", status: "Processing" },
    { inv: "#INV-09-006", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "L2 Support Add-on", qty: 5, price: "120.00", grand: "97.19", method: "Visa", status: "Processing" },
    { inv: "#INV-09-007", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Wireless Desk Set", qty: 12, price: "89.99", grand: "12.50", method: "Visa", status: "Processing" },
    { inv: "#INV-09-008", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "Visa", status: "Processing" },
    { inv: "#INV-09-009", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "L2 Support Add-on", qty: 5, price: "120.00", grand: "97.19", method: "Visa", status: "Processing" },
    { inv: "#INV-09-010", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "ACH", status: "Processing" },
    { inv: "#INV-09-011", date: "09/01/2026", time: "10:14 AM", sku: "SKU-44289", desc: "Enterprise SaaS - Monthly Tier", qty: 1, price: "89.99", grand: "97.19", method: "ACH", status: "Processing" },
  ];

  return (
    <div className="space-y-3 mt-3">
      {/* Control bar above preview with view mode switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-gray-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guarded Output Verified</span>
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Policy: <span className="font-mono text-gray-700 font-medium">{policyApplied}</span> &middot; Latency: {reductionLatency}
          </span>
        </div>

        {/* Sub-tab view selector */}
        <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md text-[11px] font-medium text-gray-600">
          <button
            type="button"
            onClick={() => setActiveSubTab("split")}
            className={`px-2 py-1 rounded transition-colors ${
              activeSubTab === "split"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("spreadsheet")}
            className={`px-2 py-1 rounded transition-colors ${
              activeSubTab === "spreadsheet"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            Excel Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("pdf")}
            className={`px-2 py-1 rounded transition-colors ${
              activeSubTab === "pdf"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            PDF Audit Record
          </button>
        </div>
      </div>

      {/* If this card has a live rendered preview (from Live Drag & Drop upload), display the real document! */}
      {previewUrl ? (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-950 p-3 sm:p-5 text-center shadow-xs">
          <div className="inline-block max-w-full rounded-lg shadow-2xl overflow-hidden bg-white">
            <img
              src={previewUrl}
              alt="Live Redacted Document"
              className="max-h-[500px] w-auto object-contain mx-auto"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 font-mono px-2">
            <span>Live Enclave Render: {filename}</span>
            <span className="text-emerald-400">0-leakage verified &bull; Solid black redaction bars applied</span>
          </div>
        </div>
      ) : previewText ? (
        <div className="bg-zinc-900 text-zinc-100 rounded-xl p-4 font-mono text-xs max-h-80 overflow-y-auto whitespace-pre-wrap border border-zinc-800">
          <div className="text-[11px] text-zinc-400 mb-2 border-b border-zinc-800 pb-1 font-sans font-semibold">
            Redacted Text Extract &bull; {filename}
          </div>
          {previewText}
        </div>
      ) : (
        /* Otherwise render the default split view for canonical seed events */
        <div
          className={`grid gap-4 ${
            activeSubTab === "split"
              ? "grid-cols-1 xl:grid-cols-2"
              : "grid-cols-1"
          }`}
        >

        {/* Document 1: Excel Spreadsheet View */}
        {(activeSubTab === "split" || activeSubTab === "spreadsheet") && (
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-xs flex flex-col">
            {/* Excel Window Header */}
            <div className="bg-[#107c41] text-white px-3 py-1.5 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span className="font-medium truncate max-w-[200px] sm:max-w-none">
                  {filename} - Excel (Guarded Derivative)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] opacity-90">
                <span className="hidden sm:inline bg-[#0b5a2f] px-2 py-0.5 rounded text-[10px] font-mono">
                  REDACTED
                </span>
                <span className="hover:opacity-100 cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Excel Menu Bar */}
            <div className="bg-[#f3f2f1] border-b border-gray-200 px-3 py-1 flex items-center gap-3 text-[11px] text-gray-700 select-none overflow-x-auto">
              <span className="hover:text-black cursor-pointer">File</span>
              <span className="font-semibold text-[#107c41] border-b-2 border-[#107c41] pb-0.5">Home</span>
              <span className="hover:text-black cursor-pointer">Insert</span>
              <span className="hover:text-black cursor-pointer hidden sm:inline">Page Layout</span>
              <span className="hover:text-black cursor-pointer hidden md:inline">Formulas</span>
              <span className="hover:text-black cursor-pointer">Data</span>
              <span className="hover:text-black cursor-pointer hidden lg:inline">Review</span>
              <span className="hover:text-black cursor-pointer hidden lg:inline">View</span>
            </div>

            {/* Formula Bar */}
            <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center gap-2 text-[11px] text-gray-500 font-mono">
              <span className="italic font-bold text-gray-400 select-none">fx</span>
              <div className="w-[1px] h-3 bg-gray-300" />
              <span className="text-gray-800 text-[10px] truncate">
                September 2026 Sales &amp; Transactions - Guarded View [Customer columns redacted]
              </span>
            </div>

            {/* Spreadsheet Table */}
            <div className="overflow-x-auto max-h-[380px] text-[11px] font-sans">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#f3f2f1] border-b border-gray-300 select-none text-[10px] font-semibold text-gray-600">
                    <th className="w-8 border-r border-gray-300 py-1 text-center bg-[#e1dfdd]">#</th>
                    <th className="border-r border-gray-300 px-2.5 py-1 min-w-[90px]">Order ID</th>
                    <th className="border-r border-gray-300 px-2 py-1 min-w-[80px]">Date</th>
                    <th className="border-r border-gray-300 px-2 py-1 min-w-[130px] bg-red-50/50">
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <Lock className="w-2.5 h-2.5" /> Customer Name
                      </span>
                    </th>
                    <th className="border-r border-gray-300 px-2 py-1 min-w-[140px] bg-red-50/50">
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <Lock className="w-2.5 h-2.5" /> Customer Email
                      </span>
                    </th>
                    <th className="border-r border-gray-300 px-2 py-1 min-w-[110px] bg-red-50/50">
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <Lock className="w-2.5 h-2.5" /> Phone Number
                      </span>
                    </th>
                    <th className="border-r border-gray-300 px-2 py-1 min-w-[120px]">Product/Service</th>
                    <th className="border-r border-gray-300 px-2 py-1 text-center">Qty</th>
                    <th className="border-r border-gray-300 px-2 py-1 text-right">Unit Price</th>
                    <th className="border-r border-gray-300 px-2 py-1 text-right">Total</th>
                    <th className="px-2 py-1 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {spreadsheetRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/40">
                      <td className="border-r border-gray-300 py-1 text-center text-[10px] bg-[#f3f2f1] text-gray-500 font-mono select-none">
                        {idx + 1}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 font-mono text-[10px] text-gray-700 whitespace-nowrap">
                        {row.id}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-gray-600 whitespace-nowrap">
                        {row.date}
                      </td>
                      {/* Redacted Customer Name column */}
                      <td className="border-r border-gray-200 px-2 py-1 bg-gray-50/50">
                        <div
                          className="h-3.5 bg-black rounded-xs w-[85%] max-w-[110px]"
                          title="Policy redacted: Customer Name suppressed"
                        />
                      </td>
                      {/* Redacted Customer Email column */}
                      <td className="border-r border-gray-200 px-2 py-1 bg-gray-50/50">
                        <div
                          className="h-3.5 bg-black rounded-xs w-[92%] max-w-[130px]"
                          title="Policy redacted: Email address suppressed"
                        />
                      </td>
                      {/* Redacted Phone Number column */}
                      <td className="border-r border-gray-200 px-2 py-1 bg-gray-50/50">
                        <div
                          className="h-3.5 bg-black rounded-xs w-[80%] max-w-[95px]"
                          title="Policy redacted: Phone number suppressed"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-gray-800 whitespace-nowrap">
                        {row.product}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-center text-gray-700 font-mono">
                        {row.qty}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-right text-gray-700 font-mono">
                        {row.unit}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-1 text-right font-medium text-gray-900 font-mono">
                        {row.total}
                      </td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            row.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : row.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : row.status === "Refunded"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Excel Sheet Tabs Footer */}
            <div className="bg-[#f3f2f1] border-t border-gray-300 px-2 py-1 flex items-center justify-between text-[11px] text-gray-600 select-none">
              <div className="flex items-center gap-1">
                <span className="bg-white border-t-2 border-[#107c41] px-3 py-0.5 text-[#107c41] font-semibold rounded-t shadow-xs">
                  Sept 2026 Sales
                </span>
                <span className="px-2 py-0.5 hover:text-black cursor-pointer">August 2026</span>
                <span className="px-1 py-0.5 text-gray-400">+</span>
              </div>
              <div className="text-[10px] font-mono text-gray-500">
                100% &middot; Redaction Plan Verified
              </div>
            </div>
          </div>
        )}

        {/* Document 2: Confidential PDF Record View */}
        {(activeSubTab === "split" || activeSubTab === "pdf") && (
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-[#2b2b2b] shadow-xs flex flex-col">
            {/* PDF Viewer Dark Ribbon */}
            <div className="bg-[#1e1e1e] text-gray-200 px-3 py-1.5 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                <span className="font-medium text-gray-200 truncate max-w-[200px]">
                  September_2026_Sales_Records.pdf
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="font-mono text-gray-300">Page 3 of 12</span>
                <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
                  <ZoomOut className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                  <ZoomIn className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Paper Document Container */}
            <div className="p-3 sm:p-4 bg-[#383838] overflow-x-auto max-h-[380px]">
              <div className="bg-white mx-auto p-4 sm:p-6 rounded shadow-md max-w-xl text-[10px] font-sans text-gray-800 relative">
                {/* Watermark / Stamp */}
                <div className="absolute top-4 right-4 border-2 border-red-600 text-red-600 font-mono font-bold text-[10px] uppercase px-2 py-0.5 tracking-wider rotate-3 opacity-80 select-none">
                  CONFIDENTIAL
                </div>

                {/* PDF Header */}
                <div className="border-b border-gray-800 pb-2 mb-3">
                  <div className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">
                    GLOBAL ENTERPRISES &middot; COMPLIANCE LEDGER
                  </div>
                  <h4 className="text-sm font-bold tracking-tight text-gray-900 mt-0.5">
                    SEPTEMBER 2026 SALES &amp; TRANSACTIONS RECORD
                  </h4>
                  <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                    REDACTCORE PRIVACY-PRESERVED AUDIT COPY &middot; POST-VERIFIED
                  </div>
                </div>

                {/* PDF Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[9px]">
                    <thead>
                      <tr className="border-b border-gray-400 text-[8px] font-mono uppercase tracking-wider text-gray-600">
                        <th className="py-1">Invoice #</th>
                        <th className="py-1">Date</th>
                        <th className="py-1">Time</th>
                        <th className="py-1 text-red-700">Customer Name</th>
                        <th className="py-1">Item SKU</th>
                        <th className="py-1">Product Description</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Grand Total</th>
                        <th className="py-1 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono">
                      {pdfRows.map((row) => (
                        <tr key={row.inv} className="hover:bg-gray-50">
                          <td className="py-1 font-semibold text-gray-900">{row.inv}</td>
                          <td className="py-1 text-gray-600">{row.date}</td>
                          <td className="py-1 text-gray-500">{row.time}</td>
                          {/* Redacted Customer Bar */}
                          <td className="py-1">
                            <div className="h-3 bg-black rounded-xs w-20" />
                          </td>
                          <td className="py-1 text-gray-600">{row.sku}</td>
                          <td className="py-1 font-sans text-gray-800 truncate max-w-[120px]">
                            {row.desc}
                          </td>
                          <td className="py-1 text-center text-gray-700">{row.qty}</td>
                          <td className="py-1 text-right font-semibold text-gray-900">
                            ${row.grand}
                          </td>
                          <td className="py-1 text-center font-sans">
                            <span className="text-[8px] px-1 py-0.2 bg-gray-100 rounded text-gray-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PDF Footer */}
                <div className="border-t border-gray-300 pt-2 mt-4 flex items-center justify-between text-[8px] font-mono text-gray-500 select-none">
                  <span>CONFIDENTIAL - STRICT ACCESS ONLY</span>
                  <span>Page 3 of 12</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}


