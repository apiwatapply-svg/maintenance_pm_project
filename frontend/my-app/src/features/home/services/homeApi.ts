import axios from "axios";
import config from "@/app/config";
import type { HomeFeature } from "../types";

export async function fetchHomeFeatures(): Promise<HomeFeature[]> {
  const response = await axios.get(`${config.apiServer}/api/home/features`);
  return response.data.data;
}
