"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import config from "../config";

type ToolingAction = "RECEIVE" | "ISSUE" | "BORROW" | "RETURN";

type ToolStoreItem = {
  id: number;
  itemCode: string;
  name: string;
  itemType: "TOOLING" | "SPARE_PART";
  currentStock: number;
  minStock: number;
  unit: string;
  location?: string | null;
  barcode?: string | null;
};

type ToolStoreTransaction = {
  id: number;
  action: ToolingAction;
  quantity: number;
  beforeStock: number;
  afterStock: number;
  createdAt: string;
  item?: ToolStoreItem;
};

const actionLabels: Record<ToolingAction, string> = {
  RECEIVE: "Receive",
  ISSUE: "Issue",
  BORROW: "Borrow",
  RETURN: "Return",
};

export default function ToolingStorePage() {
  const [action, setAction] = useState<ToolingAction>("RECEIVE");
  const [items, setItems] = useState<ToolStoreItem[]>([]);
  const [transactions, setTransactions] = useState<ToolStoreTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [scanCode, setScanCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [quickItem, setQuickItem] = useState({
    itemCode: "",
    name: "",
    itemType: "TOOLING",
    category: "OTHER",
    categoryOther: "",
    currentStock: "0",
    minStock: "0",
    location: "",
    barcode: "",
  });

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      `${item.itemCode} ${item.name} ${item.barcode || ""} ${item.location || ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  const loadToolStore = async () => {
    const [itemsResponse, transactionResponse] = await Promise.all([
      axios.get(`${config.apiServer}/api/tool-store/items`),
      axios.get(`${config.apiServer}/api/tool-store/transactions`),
    ]);
    setItems(itemsResponse.data.data || []);
    setTransactions(transactionResponse.data.data || []);
  };

  useEffect(() => {
    loadToolStore().catch((err) => {
      console.error("Failed to load tooling store", err);
      setError("Tooling & Store API is unavailable.");
    });
  }, []);

  const handleScanLookup = async () => {
    if (!scanCode.trim()) return;
    setError("");
    setMessage("");
    try {
      const response = await axios.get(`${config.apiServer}/api/tool-store/scan/${encodeURIComponent(scanCode.trim())}`);
      const item = response.data.data as ToolStoreItem;
      setSelectedItemId(item.id);
      setSearch(`${item.itemCode} - ${item.name}`);
      setMessage(`Found ${item.itemCode}`);
    } catch (err) {
      console.error("Scan lookup failed", err);
      setError("Scan code not found. Add it as a new item if this is an Other case.");
      setQuickItem((prev) => ({ ...prev, itemCode: scanCode.trim(), barcode: scanCode.trim() }));
    }
  };

  const handleCreateItem = async () => {
    setError("");
    setMessage("");
    try {
      const response = await axios.post(`${config.apiServer}/api/tool-store/items`, quickItem);
      const item = response.data.data as ToolStoreItem;
      setItems((prev) => [item, ...prev]);
      setSelectedItemId(item.id);
      setSearch(`${item.itemCode} - ${item.name}`);
      setMessage(`Added ${item.itemCode}`);
    } catch (err: unknown) {
      console.error("Create item failed", err);
      setError("Cannot add item. Check item code and name.");
    }
  };

  const handleSaveTransaction = async () => {
    setError("");
    setMessage("");
    try {
      const response = await axios.post(`${config.apiServer}/api/tool-store/transactions`, {
        itemId: selectedItemId,
        action,
        quantity,
        scanCode,
        note,
      });
      const result = response.data.data;
      setItems((prev) => prev.map((item) => (item.id === result.item.id ? result.item : item)));
      setTransactions((prev) => [result.transaction, ...prev].slice(0, 100));
      setMessage(`${actionLabels[action]} saved. Stock ${result.transaction.beforeStock} -> ${result.transaction.afterStock}`);
      setNote("");
    } catch (err: unknown) {
      console.error("Save transaction failed", err);
      setError("Cannot save transaction. Check stock, item, and permission.");
    }
  };

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

      {(message || error) && (
        <div className={`alert ${error ? "alert-danger" : "alert-success"} border-0 shadow-sm`}>
          {error || message}
        </div>
      )}

      <div className="row g-3 mb-4">
        {(["RECEIVE", "ISSUE", "BORROW", "RETURN"] as ToolingAction[]).map((item) => (
          <div className="col-6 col-lg-3" key={item}>
            <button
              className={`btn w-100 text-start border shadow-sm ${action === item ? "btn-primary" : "btn-light"}`}
              onClick={() => setAction(item)}
              type="button"
            >
              <span className="d-flex align-items-center justify-content-between gap-2">
                <span className="fw-semibold">{actionLabels[item]}</span>
                <i className={`bi ${item === "RECEIVE" ? "bi-box-arrow-in-down" : item === "ISSUE" ? "bi-box-arrow-up" : item === "BORROW" ? "bi-arrow-left-right" : "bi-check2-circle"}`} />
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
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                const matched = items.find((item) => `${item.itemCode} - ${item.name}` === value);
                setSelectedItemId(matched?.id || null);
              }}
            />
            <datalist id="tooling-store-options">
              {filteredItems.map((item) => (
                <option key={item.id} value={`${item.itemCode} - ${item.name}`} />
              ))}
              <option value="Other" />
            </datalist>
            {selectedItem && (
              <div className="small text-muted mt-2">
                Stock: <strong>{selectedItem.currentStock}</strong> {selectedItem.unit}
                {selectedItem.location ? ` / ${selectedItem.location}` : ""}
              </div>
            )}
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
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleScanLookup();
                  }
                }}
              />
              <button className="btn btn-outline-primary" type="button" onClick={handleScanLookup}>
                Find
              </button>
            </div>
          </div>

          <div className="col-12 col-lg-1">
            <label className="form-label fw-semibold">Qty</label>
            <input className="form-control" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>

          <div className="col-12 col-lg-2 d-flex align-items-end">
            <button className="btn btn-primary w-100" type="button" onClick={handleSaveTransaction}>
              <i className="bi bi-check2 me-1" />
              Save
            </button>
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold">Note</label>
            <input className="form-control" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-3 shadow-sm p-4 mb-4">
        <h2 className="h6 fw-bold mb-3">Quick Add Item</h2>
        <div className="row g-3">
          <div className="col-12 col-md-2">
            <label className="form-label small fw-semibold">Code</label>
            <input className="form-control" value={quickItem.itemCode} onChange={(event) => setQuickItem({ ...quickItem, itemCode: event.target.value })} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label small fw-semibold">Name</label>
            <input className="form-control" value={quickItem.name} onChange={(event) => setQuickItem({ ...quickItem, name: event.target.value })} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold">Type</label>
            <select className="form-select" value={quickItem.itemType} onChange={(event) => setQuickItem({ ...quickItem, itemType: event.target.value })}>
              <option value="TOOLING">Tooling</option>
              <option value="SPARE_PART">Store / Spare Part</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold">Opening Stock</label>
            <input className="form-control" value={quickItem.currentStock} onChange={(event) => setQuickItem({ ...quickItem, currentStock: event.target.value })} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label small fw-semibold">Barcode</label>
            <div className="input-group">
              <input className="form-control" value={quickItem.barcode} onChange={(event) => setQuickItem({ ...quickItem, barcode: event.target.value })} />
              <button className="btn btn-outline-primary" type="button" onClick={handleCreateItem}>
                Add
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="bg-white border rounded-3 shadow-sm p-4 h-100">
            <h2 className="h6 fw-bold mb-3">Current Stock</h2>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th className="text-end">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 12).map((item) => (
                    <tr key={item.id}>
                      <td className="font-monospace">{item.itemCode}</td>
                      <td>{item.name}</td>
                      <td>{item.itemType}</td>
                      <td className="text-end fw-semibold">{item.currentStock}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-4">No tooling/store items yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="bg-white border rounded-3 shadow-sm p-4 h-100">
            <h2 className="h6 fw-bold mb-3">Recent Transactions</h2>
            <div className="list-group list-group-flush">
              {transactions.slice(0, 8).map((transaction) => (
                <div className="list-group-item px-0" key={transaction.id}>
                  <div className="d-flex justify-content-between gap-2">
                    <strong>{transaction.action}</strong>
                    <span className="text-muted small">{transaction.beforeStock} {"->"} {transaction.afterStock}</span>
                  </div>
                  <div className="text-muted small">{transaction.item?.itemCode} {transaction.item?.name}</div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-muted text-center py-4">No transactions yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
