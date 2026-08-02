import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  formatErrorJson,
  handleApiError
} from "./chunk-NM43FFV6.js";
import {
  isAPIError
} from "./chunk-SOFC4MLS.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";

// src/commands/metrics/schema-api.ts
function toMetricDetail(metric) {
  return {
    id: metric.id,
    description: metric.description,
    dimensions: metric.dimensions,
    unit: metric.unit,
    aggregations: metric.aggregations,
    defaultAggregation: metric.defaultAggregation
  };
}
function getDefaultAggregation(detail, metricId) {
  return detail.find((metric) => metric.id === metricId)?.defaultAggregation;
}
async function fetchMetricList(client, accountId) {
  const { metrics } = await client.fetch(
    "/v2/observability/schema",
    { accountId }
  );
  return metrics;
}
async function fetchMetricDetail(client, accountId, metricId) {
  const detail = await client.fetch(
    `/v2/observability/schema/${encodeURIComponent(metricId)}`,
    { accountId }
  );
  return detail.map(toMetricDetail);
}
async function fetchMetricListOrExit(client, accountId, jsonOutput) {
  try {
    return await fetchMetricList(client, accountId);
  } catch (err) {
    if (isAPIError(err)) {
      return handleApiError(err, jsonOutput, client, {
        401: {
          code: "SCHEMA_UNAUTHORIZED",
          message: "The metrics schema API request was not authorized. Run `vercel login` to authenticate and `vercel switch` to select a team, then try again."
        },
        403: {
          code: "SCHEMA_UNAUTHORIZED",
          message: "The metrics schema API request was not authorized. Run `vercel login` to authenticate and `vercel switch` to select a team, then try again."
        }
      });
    }
    const message = err instanceof Error ? `Failed to fetch metrics schema: ${err.message}` : `Failed to fetch metrics schema: ${String(err)}`;
    if (jsonOutput) {
      client.stdout.write(formatErrorJson("SCHEMA_FETCH_FAILED", message));
    } else {
      output_manager_default.error(message);
    }
    return 1;
  }
}
async function fetchMetricDetailOrExit(client, accountId, metricId, jsonOutput) {
  try {
    return await fetchMetricDetail(client, accountId, metricId);
  } catch (err) {
    if (isAPIError(err)) {
      return handleApiError(err, jsonOutput, client, {
        401: {
          code: "SCHEMA_UNAUTHORIZED",
          message: "The metrics schema API request was not authorized. Run `vercel login` to authenticate and `vercel switch` to select a team, then try again."
        },
        403: {
          code: "SCHEMA_UNAUTHORIZED",
          message: "The metrics schema API request was not authorized. Run `vercel login` to authenticate and `vercel switch` to select a team, then try again."
        }
      });
    }
    const message = err instanceof Error ? `Failed to fetch metrics schema: ${err.message}` : `Failed to fetch metrics schema: ${String(err)}`;
    if (jsonOutput) {
      client.stdout.write(formatErrorJson("SCHEMA_FETCH_FAILED", message));
    } else {
      output_manager_default.error(message);
    }
    return 1;
  }
}

export {
  getDefaultAggregation,
  fetchMetricListOrExit,
  fetchMetricDetailOrExit
};
