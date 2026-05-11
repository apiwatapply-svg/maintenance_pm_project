const axios = require("axios");

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5006/api";
const token = process.env.API_TOKEN;

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

async function run() {
  const machinesResponse = await client.get("/machines");
  const machines = machinesResponse.data?.data || machinesResponse.data || [];
  const first = machines[0];

  if (!first) {
    console.log("No machine found for simulation.");
    return;
  }

  const actualCount = Math.floor(Math.random() * 1000);
  const ngCount = Math.floor(Math.random() * 20);

  const response = await client.post(`/machines/${first.id}/status`, {
    status: "RUNNING",
    actualCount,
    targetCount: 1000,
    ngCount,
  });

  console.log(`Updated simulated status for machine ${first.id}`);
  console.log(JSON.stringify(response.data, null, 2));
}

run().catch((error) => {
  console.error(error.response?.data || error.message);
  process.exit(1);
});
