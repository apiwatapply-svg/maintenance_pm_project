"use client";

import { useMemo, useState } from "react";
import type { JobRequestFormData, JobRequestOptions } from "../types";

const initialForm: JobRequestFormData = {
  machineId: "",
  category: "",
  categoryOther: "",
  symptom: "",
  symptomOther: "",
  priority: "NORMAL",
  productionImpact: false,
  machineStopped: false,
  ngCount: "",
  description: "",
};

type Props = {
  options: JobRequestOptions;
  submitting: boolean;
  onSubmit: (data: JobRequestFormData) => Promise<void>;
};

export default function JobRequestFastForm({ options, submitting, onSubmit }: Props) {
  const [form, setForm] = useState<JobRequestFormData>(initialForm);
  const [machineSearch, setMachineSearch] = useState("");

  const selectedMachine = useMemo(
    () => options.machines.find((machine) => machine.id.toString() === form.machineId),
    [form.machineId, options.machines]
  );

  const updateField = (field: keyof JobRequestFormData, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMachineSearch = (value: string) => {
    setMachineSearch(value);
    const match = options.machines.find((machine) => machine.label === value);
    updateField("machineId", match ? match.id.toString() : "");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
    setForm(initialForm);
    setMachineSearch("");
  };

  return (
    <form onSubmit={submit} className="border rounded-3 p-3 bg-white shadow-sm">
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label fw-semibold">Zone / Type / Machine No.</label>
          <input
            className="form-control"
            list="job-request-machines"
            value={machineSearch}
            onChange={(event) => handleMachineSearch(event.target.value)}
            placeholder="Search zone, type, machine no..."
            required
          />
          <datalist id="job-request-machines">
            {options.machines.map((machine) => (
              <option key={machine.id} value={machine.label} />
            ))}
          </datalist>
          {selectedMachine && (
            <div className="small text-muted mt-1">
              {selectedMachine.zoneName} / {selectedMachine.typeName} / {selectedMachine.machineNo}
            </div>
          )}
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold">Category</label>
          <select
            className="form-select"
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            required
          >
            <option value="">Select category</option>
            {options.categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold">Symptom</label>
          <select
            className="form-select"
            value={form.symptom}
            onChange={(event) => updateField("symptom", event.target.value)}
            required
          >
            <option value="">Select symptom</option>
            {options.symptoms.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {form.category === "OTHER" && (
          <div className="col-md-6">
            <label className="form-label fw-semibold">Other Category</label>
            <input
              className="form-control"
              value={form.categoryOther}
              onChange={(event) => updateField("categoryOther", event.target.value)}
              required
            />
          </div>
        )}

        {form.symptom === "OTHER" && (
          <div className="col-md-6">
            <label className="form-label fw-semibold">Other Symptom</label>
            <input
              className="form-control"
              value={form.symptomOther}
              onChange={(event) => updateField("symptomOther", event.target.value)}
              required
            />
          </div>
        )}

        <div className="col-md-4">
          <label className="form-label fw-semibold">Priority</label>
          <select
            className="form-select"
            value={form.priority}
            onChange={(event) => updateField("priority", event.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label fw-semibold">NG Count</label>
          <input
            className="form-control"
            type="number"
            min="0"
            value={form.ngCount}
            onChange={(event) => updateField("ngCount", event.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="col-md-4 d-flex align-items-end gap-3">
          <div className="form-check">
            <input
              className="form-check-input"
              id="productionImpact"
              type="checkbox"
              checked={form.productionImpact}
              onChange={(event) => updateField("productionImpact", event.target.checked)}
            />
            <label className="form-check-label" htmlFor="productionImpact">
              Production impact
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              id="machineStopped"
              type="checkbox"
              checked={form.machineStopped}
              onChange={(event) => updateField("machineStopped", event.target.checked)}
            />
            <label className="form-check-label" htmlFor="machineStopped">
              Stopped
            </label>
          </div>
        </div>

        <div className="col-12">
          <label className="form-label fw-semibold">Note</label>
          <textarea
            className="form-control"
            rows={2}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional short detail"
          />
        </div>

        <div className="col-12 d-flex justify-content-end">
          <button className="btn btn-primary" type="submit" disabled={submitting || !form.machineId}>
            {submitting ? "Submitting..." : "Create Job Request"}
          </button>
        </div>
      </div>
    </form>
  );
}
