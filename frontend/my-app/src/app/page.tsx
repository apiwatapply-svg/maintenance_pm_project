"use client";

import { HomeFeatureGrid } from "@/features/home/components/HomeFeatureGrid";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="container-fluid bg-light min-vh-100 py-4 px-4">
      <HomeFeatureGrid />
    </main>
  );
}
