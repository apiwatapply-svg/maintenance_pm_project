"use client";

import Link from "next/link";
import type { HomeFeature } from "../types";

type Props = {
  feature: HomeFeature;
};

const featureIcons: Record<string, string> = {
  dashboard: "bi-speedometer2",
  machine: "bi-hdd-stack",
  preventive: "bi-clipboard-check",
  job_request: "bi-lightning-charge",
  work_order: "bi-kanban",
  tool_store: "bi-boxes",
  tooling: "bi-tools",
  spare_part: "bi-box-seam",
  analysis: "bi-graph-up",
  three_d: "bi-box",
  report: "bi-file-earmark-bar-graph",
  notification: "bi-bell",
  user_permission: "bi-shield-lock",
  setting: "bi-gear",
  predictive: "bi-cpu",
};

export function HomeFeatureCard({ feature }: Props) {
  const locked = !feature.permissions.view;
  const disabled = !feature.enabled || locked;
  const href = feature.future ? "/predictive-future" : feature.route_path || "/";
  const icon = featureIcons[feature.feature_key] || "bi-grid";

  return (
    <div className={`card h-100 border-0 shadow-sm ${disabled ? "opacity-75" : ""}`}>
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="d-inline-flex align-items-center justify-content-center rounded bg-primary bg-opacity-10 text-primary" style={{ width: 36, height: 36 }}>
              <i className={`bi ${icon}`} />
            </span>
            <h2 className="h6 fw-bold mb-0">{feature.title}</h2>
          </div>
          {feature.future && <span className="badge text-bg-warning">Upcoming</span>}
          {locked && !feature.future && <span className="badge text-bg-secondary">Locked</span>}
        </div>

        <p className="text-muted small mb-0">{feature.description || "Open feature workspace."}</p>

        {Object.keys(feature.summary || {}).length > 0 && (
          <div className="small text-muted border-top pt-2">
            {Object.entries(feature.summary).map(([key, value]) => (
              <div className="d-flex justify-content-between gap-2" key={key}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto">
          {disabled && !feature.future ? (
            <button className="btn btn-outline-secondary btn-sm w-100" disabled>
              Unavailable
            </button>
          ) : (
            <Link className={`btn btn-sm w-100 ${feature.future ? "btn-outline-warning" : "btn-primary"}`} href={href}>
              {feature.future ? "Preview" : "Open"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
