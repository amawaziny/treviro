import { NextResponse } from "next/server";

// Number of companies and batch size must match your scan-stock logic
const TOTAL_COMPANIES = 235;
const BATCH_SIZE = 20;

export async function GET() {
  const isDev = process.env.NODE_ENV === "development";
  const baseUrl = isDev
    ? "http://localhost:9002"
    : process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
  console.log(baseUrl);
  const batchCount = Math.ceil(TOTAL_COMPANIES / BATCH_SIZE);
  const batchPromises = Array.from({ length: batchCount }, (_, i) => {
    const offset = i * BATCH_SIZE;
    const url = `${baseUrl}/api/scan-stock?offset=${offset}&limit=${BATCH_SIZE}`;
    return fetch(url)
      .then(async (res) => {
        const data = await res.json();
        console.log(
          `Batch ${i + 1} of ${batchCount} completed successfully ${new Date().toISOString()} with ${data.updated} updated`,
        );
        return { offset, success: true, data };
      })
      .catch((error) => {
        return { offset, success: false, error: (error as Error).message };
      });
  });

  const results = await Promise.all(batchPromises);
  const errors = results.filter((r) => !r.success);

  return NextResponse.json({
    success: errors.length === 0,
    results,
    errors,
  });
}
