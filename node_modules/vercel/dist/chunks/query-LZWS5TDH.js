import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  fetchMetricDetailOrExit,
  getDefaultAggregation
} from "./chunk-GFG6QDIE.js";
import {
  computeGranularity,
  formatText
} from "./chunk-XIG4GH62.js";
import {
  formatErrorJson,
  formatQueryJson,
  getRollupColumnName,
  handleApiError
} from "./chunk-NM43FFV6.js";
import "./chunk-5AJPMLDV.js";
import "./chunk-A3NYPUKZ.js";
import {
  resolveTimeRange,
  validateAllProjectMutualExclusivity
} from "./chunk-BUZRVER7.js";
import "./chunk-RQ7H43CJ.js";
import {
  validateJsonOutput
} from "./chunk-XPKWKPWA.js";
import {
  metricsCommand
} from "./chunk-CSJBZKC5.js";
import "./chunk-VXYGCOKL.js";
import "./chunk-KT4XXKJK.js";
import {
  getLinkedProject,
  getProjectByNameOrId,
  getScope
} from "./chunk-4CCY5OPH.js";
import "./chunk-ECCWJHC6.js";
import "./chunk-TJJ562C5.js";
import {
  printError
} from "./chunk-KBEX5MYS.js";
import {
  parseArguments
} from "./chunk-XLKFJPMT.js";
import {
  ProjectNotFound,
  getFlagsSpecification,
  isAPIError
} from "./chunk-SOFC4MLS.js";
import "./chunk-P4QNYOFB.js";
import "./chunk-52QYYTM5.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";
import "./chunk-GGP5R3FU.js";
import "./chunk-S7KYDPEM.js";
import "./chunk-TZ2YI2VH.js";

// src/commands/metrics/validation.ts
function validateRequiredMetric(metric) {
  if (metric) {
    return { valid: true, value: metric };
  }
  return {
    valid: false,
    code: "MISSING_METRIC",
    message: "Missing required metric. Specify the metric to query.\n\nRun 'vercel metrics schema' to see available metrics."
  };
}
function validateOrderDirection(orderDirection) {
  if (orderDirection === void 0) {
    return { valid: true, value: void 0 };
  }
  if (orderDirection === "asc" || orderDirection === "desc") {
    return { valid: true, value: orderDirection };
  }
  return {
    valid: false,
    code: "INVALID_ORDER",
    message: `Invalid order "${orderDirection}". Use "asc" or "desc".`,
    allowedValues: ["asc", "desc"]
  };
}
function validateOrderBy(orderBy) {
  if (orderBy === void 0) {
    return { valid: true, value: void 0 };
  }
  if (orderBy === "value" || orderBy === "count") {
    return { valid: true, value: orderBy };
  }
  return {
    valid: false,
    code: "INVALID_ORDER_BY",
    message: `Invalid order-by "${orderBy}". Use "value" or "count".`,
    allowedValues: ["value", "count"]
  };
}

// src/commands/metrics/query.ts
function handleValidationError(result, jsonOutput, client) {
  if (jsonOutput) {
    client.stdout.write(
      formatErrorJson(result.code, result.message, result.allowedValues)
    );
  } else {
    output_manager_default.error(result.message);
    if (result.allowedValues && result.allowedValues.length > 0) {
      output_manager_default.print(`
Available values: ${result.allowedValues.join(", ")}
`);
    }
  }
  return 1;
}
var PRODUCTION_ENVIRONMENT_FILTER = "environment eq 'production'";
function combineFilters(filters, prod) {
  const nonEmptyFilters = [
    ...filters?.filter((filter) => filter.length > 0) ?? [],
    ...prod ? [PRODUCTION_ENVIRONMENT_FILTER] : []
  ];
  if (nonEmptyFilters.length === 0) {
    return void 0;
  }
  if (nonEmptyFilters.length === 1) {
    return nonEmptyFilters[0];
  }
  return nonEmptyFilters.map((filter) => `(${filter})`).join(" and ");
}
function getRequestOrderBy(metric, aggregation, orderBy) {
  return orderBy === "value" ? getRollupColumnName(metric, aggregation) : void 0;
}
async function resolveQueryScope(client, opts) {
  if (opts.project || opts.all) {
    const { team } = await getScope(client);
    if (!team) {
      const errMsg = "No team context found. Run `vercel switch` to select a team, or use `vercel link` in a project directory.";
      if (opts.jsonOutput) {
        client.stdout.write(formatErrorJson("NO_TEAM", errMsg));
      } else {
        output_manager_default.error(errMsg);
      }
      return 1;
    }
    if (opts.all) {
      return {
        scope: { type: "owner", ownerId: team.id },
        accountId: team.id,
        teamName: team.slug
      };
    }
    const project = await getProjectByNameOrId(client, opts.project, team.id);
    if (project instanceof ProjectNotFound) {
      const errMsg = `Project "${opts.project}" was not found in team "${team.slug}".`;
      if (opts.jsonOutput) {
        client.stdout.write(formatErrorJson("PROJECT_NOT_FOUND", errMsg));
      } else {
        output_manager_default.error(errMsg);
      }
      return 1;
    }
    return {
      scope: {
        type: "project",
        ownerId: team.id,
        projectIds: [project.id]
      },
      accountId: team.id,
      teamName: team.slug,
      projectName: project.name
    };
  }
  const linkedProject = await getLinkedProject(client);
  if (linkedProject.status === "error") {
    return linkedProject.exitCode;
  }
  if (linkedProject.status === "not_linked") {
    const errMsg = "No linked project found. Run `vercel link` to link a project, or use --project <name-or-id> or --all.";
    if (opts.jsonOutput) {
      client.stdout.write(formatErrorJson("NOT_LINKED", errMsg));
    } else {
      output_manager_default.error(errMsg);
    }
    return 1;
  }
  return {
    scope: {
      type: "project",
      ownerId: linkedProject.org.id,
      projectIds: [linkedProject.project.id]
    },
    accountId: linkedProject.org.id,
    teamName: linkedProject.org.slug,
    projectName: linkedProject.project.name
  };
}
async function query(client, telemetry) {
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(metricsCommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    printError(err);
    return 1;
  }
  const flags = parsedArgs.flags;
  const positionalArgs = parsedArgs.args.slice(1);
  const positionalMetric = positionalArgs[0] === "query" ? positionalArgs[1] : positionalArgs[0];
  const formatResult = validateJsonOutput(flags);
  if (!formatResult.valid) {
    output_manager_default.error(formatResult.error);
    return 1;
  }
  const jsonOutput = formatResult.jsonOutput;
  const metricFlag = positionalMetric;
  const aggregationFlag = flags["--aggregation"];
  const groupBy = flags["--group-by"] ?? [];
  const limit = flags["--limit"];
  const orderByInput = typeof flags["--order-by"] === "string" ? flags["--order-by"].trim().toLowerCase() : void 0;
  const orderInput = typeof flags["--order"] === "string" ? flags["--order"].trim().toLowerCase() : void 0;
  const filters = flags["--filter"];
  const prod = flags["--prod"];
  const filter = combineFilters(filters, prod);
  const since = flags["--since"];
  const until = flags["--until"];
  const granularity = flags["--granularity"];
  const bucketTimezone = flags["--bucket-timezone"]?.trim();
  const project = flags["--project"];
  const all = flags["--all"];
  telemetry.trackCliArgumentMetricId(metricFlag);
  telemetry.trackCliOptionAggregation(aggregationFlag);
  telemetry.trackCliOptionGroupBy(groupBy.length > 0 ? groupBy : void 0);
  telemetry.trackCliOptionLimit(limit);
  telemetry.trackCliOptionOrderBy(orderByInput);
  telemetry.trackCliOptionOrder(orderInput);
  telemetry.trackCliOptionFilter(filters);
  telemetry.trackCliFlagProd(prod);
  telemetry.trackCliOptionSince(since);
  telemetry.trackCliOptionUntil(until);
  telemetry.trackCliOptionGranularity(granularity);
  telemetry.trackCliOptionBucketTimezone(bucketTimezone);
  telemetry.trackCliOptionProject(project);
  telemetry.trackCliFlagAll(all);
  telemetry.trackCliOptionFormat(flags["--format"]);
  const orderByResult = validateOrderBy(orderByInput);
  if (!orderByResult.valid) {
    return handleValidationError(orderByResult, jsonOutput, client);
  }
  const orderByMode = orderByResult.value;
  const requiredMetric = validateRequiredMetric(metricFlag);
  if (!requiredMetric.valid) {
    return handleValidationError(requiredMetric, jsonOutput, client);
  }
  const metric = requiredMetric.value;
  const mutualResult = validateAllProjectMutualExclusivity(all, project);
  if (!mutualResult.valid) {
    return handleValidationError(mutualResult, jsonOutput, client);
  }
  const orderDirectionResult = validateOrderDirection(orderInput);
  if (!orderDirectionResult.valid) {
    return handleValidationError(orderDirectionResult, jsonOutput, client);
  }
  const orderDirection = orderDirectionResult.value;
  const scopeResult = await resolveQueryScope(client, {
    project,
    all,
    jsonOutput
  });
  if (typeof scopeResult === "number") {
    return scopeResult;
  }
  const { scope, accountId, teamName, projectName } = scopeResult;
  const detailOrExitCode = await fetchMetricDetailOrExit(
    client,
    accountId,
    metric,
    jsonOutput
  );
  if (typeof detailOrExitCode === "number") {
    return detailOrExitCode;
  }
  const aggregationInput = aggregationFlag ?? getDefaultAggregation(detailOrExitCode, metric) ?? "sum";
  const aggregation = aggregationInput;
  const orderBy = getRequestOrderBy(metric, aggregation, orderByMode);
  let startTime;
  let endTime;
  try {
    ({ startTime, endTime } = resolveTimeRange(since, until));
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      client.stdout.write(formatErrorJson("INVALID_TIME", errMsg));
    } else {
      output_manager_default.error(errMsg);
    }
    return 1;
  }
  const rangeMs = endTime.getTime() - startTime.getTime();
  const granResult = computeGranularity(rangeMs, granularity);
  if (!jsonOutput && granResult.adjusted && granResult.notice) {
    output_manager_default.log(`Notice: ${granResult.notice}`);
  }
  const body = {
    scope,
    metric,
    aggregation,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    granularity: granResult.duration,
    ...bucketTimezone ? { bucketTimezone } : {},
    ...groupBy.length > 0 ? { groupBy } : {},
    ...filter ? { filter } : {},
    limit: limit ?? 10,
    ...orderBy ? { orderBy } : {},
    ...orderDirection ? { orderDirection } : {}
  };
  if (!jsonOutput) {
    output_manager_default.spinner("Querying metrics...");
  }
  let response;
  try {
    response = await client.fetch(
      "/v2/observability/query",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        accountId,
        bailOn429: true
      }
    );
  } catch (err) {
    if (isAPIError(err)) {
      return handleApiError(err, jsonOutput, client);
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      client.stdout.write(formatErrorJson("NETWORK_ERROR", errMsg));
    } else {
      output_manager_default.error(errMsg);
    }
    return 1;
  } finally {
    if (!jsonOutput) {
      output_manager_default.stopSpinner();
    }
  }
  if (jsonOutput) {
    client.stdout.write(
      formatQueryJson(
        {
          metric,
          aggregation,
          groupBy,
          filter,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          granularity: granResult.duration,
          ...bucketTimezone ? { bucketTimezone } : {},
          ...orderByMode ? { orderBy: orderByMode } : {},
          ...orderDirection ? { orderDirection } : {}
        },
        response
      )
    );
  } else {
    client.stdout.write(
      formatText(response, {
        metric,
        metricUnit: detailOrExitCode.find((item) => item.id === metric)?.unit ?? "count",
        aggregation,
        groupBy,
        filter,
        scope,
        projectName,
        teamName,
        periodStart: startTime.toISOString(),
        periodEnd: endTime.toISOString(),
        granularity: granResult.duration,
        bucketTimezone,
        orderBy: orderByMode,
        orderDirection
      })
    );
  }
  return 0;
}
export {
  query as default
};
