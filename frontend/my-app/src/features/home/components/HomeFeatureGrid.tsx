"use client";

import { useEffect, useState } from "react";
import { fetchHomeFeatures } from "../services/homeApi";
import type { HomeFeature } from "../types";
import { HomeFeatureCard } from "./HomeFeatureCard";

export function HomeFeatureGrid() {
  const [features, setFeatures] = useState<HomeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHomeFeatures()
      .then((items) => {
        setFeatures(items);
        setError("");
      })
      .catch((err) => {
        console.error("Failed to fetch home features", err);
        setError("Feature portal is unavailable. The dashboard below can still be used.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border rounded-3 p-4 shadow-sm text-muted">
        Loading feature portal...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning border-0 shadow-sm mb-4">
        <i className="bi bi-exclamation-triangle me-2" />
        {error}
      </div>
    );
  }

  return (
    <section className="mb-4">
      <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
        <div>
          <h1 className="h4 fw-bold mb-1">Maintenance Main Modules</h1>
          <p className="text-muted mb-0">Choose a main card first, then work inside each module.</p>
        </div>
      </div>
      <div className="row g-3">
        {features.map((feature) => (
          <div className="col-12 col-md-6 col-xl-3" key={feature.feature_key}>
            <HomeFeatureCard feature={feature} />
          </div>
        ))}
      </div>
    </section>
  );
}
