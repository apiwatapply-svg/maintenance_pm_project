import axios from "axios";
import config from "@/app/config";
import type { JobRequest, JobRequestFormData, JobRequestOptions } from "../types";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function fetchJobRequestOptions() {
  const response = await axios.get<ApiResponse<JobRequestOptions>>(`${config.apiServer}/api/job-requests/options`);
  return response.data.data;
}

export async function fetchJobRequests() {
  const response = await axios.get<ApiResponse<JobRequest[]>>(`${config.apiServer}/api/job-requests`);
  return response.data.data;
}

export async function createJobRequest(data: JobRequestFormData) {
  const response = await axios.post<ApiResponse<JobRequest>>(`${config.apiServer}/api/job-requests`, data);
  return response.data.data;
}
