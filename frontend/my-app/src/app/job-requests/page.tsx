"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import JobRequestFastForm from "@/features/job-request/components/JobRequestFastForm";
import { createJobRequest, fetchJobRequestOptions, fetchJobRequests } from "@/features/job-request/services/jobRequestApi";
import type { JobRequest, JobRequestFormData, JobRequestOptions } from "@/features/job-request/types";

export default function JobRequestsPage() {
  const [options, setOptions] = useState<JobRequestOptions | null>(null);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [nextOptions, nextRequests] = await Promise.all([fetchJobRequestOptions(), fetchJobRequests()]);
    setOptions(nextOptions);
    setRequests(nextRequests);
  };

  useEffect(() => {
    loadData()
      .catch((error) => {
        console.error(error);
        Swal.fire("Error", "Failed to load Job Request data", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const submit = async (data: JobRequestFormData) => {
    setSubmitting(true);
    try {
      const created = await createJobRequest(data);
      setRequests((current) => [created, ...current]);
      Swal.fire("Created", `${created.requestNo} has been created`, "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to create Job Request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !options) {
    return (
      <div className="container-fluid py-4 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Job Request</h2>
          <p className="text-muted mb-0">Fast maintenance request entry</p>
        </div>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
          {requests.length} Requests
        </span>
      </div>

      <JobRequestFastForm options={options} submitting={submitting} onSubmit={submit} />

      <div className="table-responsive mt-4 bg-white border rounded-3 shadow-sm">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Request No.</th>
              <th>Machine</th>
              <th>Zone</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Category</th>
              <th>Symptom</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="fw-semibold">{request.requestNo}</td>
                <td>{request.machineNo || "-"}</td>
                <td>{request.zone || "-"}</td>
                <td>{request.machineType || "-"}</td>
                <td>
                  <span className="badge bg-warning-subtle text-dark border">{request.priority}</span>
                </td>
                <td>
                  <span className="badge bg-secondary-subtle text-secondary border">{request.status}</span>
                </td>
                <td>{request.categoryOther || request.category || "-"}</td>
                <td>{request.symptomOther || request.symptom || "-"}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="text-center text-muted py-4" colSpan={8}>
                  No Job Requests yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
