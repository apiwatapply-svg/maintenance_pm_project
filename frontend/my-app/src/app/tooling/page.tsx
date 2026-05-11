"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ToolingAction = "receive" | "issue" | "borrow" | "return";

const toolOptions = [
  "Torque Wrench TW-001",
  "Dial Gauge DG-014",
  "Caliper CP-022",
  "Spare Filter FL-100",
  "Bearing BR-6204",
  "Sensor SN-PROX-18",
];

const actionLabels: Record<ToolingAction, string> = {
  receive: "Receive",
  issue: "Issue",
  borrow: "Borrow",
  return: "Return",
};

export default function ToolingStorePage() {
  const [action, setAction] = useState<ToolingAction>("receive");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [scanCode, setScanCode] = useState("");

  const filteredTools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return toolOptions;
    return toolOptions.filter((item) => item.toLowerCase().includes(keyword));
  }, [search]);

  return (
    <main className="container-fluid bg-light min-vh-100 py-4 px-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1">Tooling & Store</h1>
          <p className="text-muted mb-0">Searchable selection and scan-first receive, issue, borrow, and return workflows.</p>
        </div>
        <Link href="/" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" />
          Main Modules
        </Link>
      </div>

      <div className="row g-3 mb-4">
        {(["receive", "issue", "borrow", "return"] as ToolingAction[]).map((item) => (
          <div className="col-6 col-lg-3" key={item}>
            <button
              className={`btn w-100 text-start border shadow-sm ${action === item ? "btn-primary" : "btn-light"}`}
              onClick={() => setAction(item)}
              type="button"
            >
              <span className="d-flex align-items-center justify-content-between gap-2">
                <span className="fw-semibold">{actionLabels[item]}</span>
                <i className={`bi ${item === "receive" ? "bi-box-arrow-in-down" : item === "issue" ? "bi-box-arrow-up" : item === "borrow" ? "bi-arrow-left-right" : "bi-check2-circle"}`} />
              </span>
            </button>
          </div>
        ))}
      </div>

      <section className="bg-white border rounded-3 shadow-sm p-4 mb-4">
        <div className="row g-3">
          <div className="col-12 col-lg-5">
            <label className="form-label fw-semibold">Search tooling or store item</label>
            <input
              className="form-control"
              list="tooling-store-options"
              placeholder="Type to search, then select item"
              value={selectedItem || search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedItem(event.target.value);
              }}
            />
            <datalist id="tooling-store-options">
              {filteredTools.map((item) => (
                <option key={item} value={item} />
              ))}
              <option value="Other" />
            </datalist>
          </div>

          <div className="col-12 col-lg-4">
            <label className="form-label fw-semibold">Scan code</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-upc-scan" />
              </span>
              <input
                className="form-control font-monospace"
                placeholder="Scan barcode / QR"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-lg-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" type="button">
              <i className="bi bi-check2 me-1" />
              Save {actionLabels[action]}
            </button>
          </div>
        </div>
      </section>

      <div className="row g-3">
        {[
          ["Tooling", "Borrow, return, damage, and calibration tracking"],
          ["Store", "Receive and issue spare parts with stock movement"],
          ["Scan Flow", "Barcode or QR input for fast receive and issue"],
          ["Audit Trail", "Transaction history ready for backend wiring"],
        ].map(([title, description]) => (
          <div className="col-12 col-md-6 col-xl-3" key={title}>
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 fw-bold">{title}</h2>
                <p className="text-muted small mb-0">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
