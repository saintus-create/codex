import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  renderThreadRow
} from "./chunk-2WILSD7J.js";
import {
  handleCommentsParseError,
  inferBranch,
  listThreads,
  resolveCommentsScope
} from "./chunk-2LBVX2H3.js";
import {
  handleValidationError,
  outputError,
  validateIntegerRangeWithDefault
} from "./chunk-BUZRVER7.js";
import {
  validateJsonOutput
} from "./chunk-XPKWKPWA.js";
import {
  listSubcommand
} from "./chunk-4LDQIDRM.js";
import {
  getScope
} from "./chunk-4CCY5OPH.js";
import "./chunk-ECCWJHC6.js";
import "./chunk-TJJ562C5.js";
import "./chunk-KBEX5MYS.js";
import {
  parseArguments
} from "./chunk-XLKFJPMT.js";
import {
  getCommandName,
  getFlagsSpecification,
  isAPIError,
  stripSensitiveAuthArgs
} from "./chunk-SOFC4MLS.js";
import "./chunk-P4QNYOFB.js";
import "./chunk-52QYYTM5.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";
import "./chunk-GGP5R3FU.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/commands/comments/list.ts
var import_chalk = __toESM(require_source(), 1);
function validateStatus(value) {
  const status = value ?? "unresolved";
  if (!["unresolved", "resolved", "all"].includes(status)) {
    return void 0;
  }
  return status;
}
async function resolveAuthors(client, authors) {
  if (!authors || authors.length === 0) {
    return void 0;
  }
  if (!authors.includes("me")) {
    return authors;
  }
  const { user } = await getScope(client);
  return authors.map((author) => author === "me" ? user.id : author);
}
function statusWord(status) {
  return status === "all" ? "" : ` ${status}`;
}
function printActiveFilters(flags) {
  const parts = [];
  if (flags["--author"]?.length) {
    parts.push(
      `--author ${flags["--author"].join(", ")} (takes a user ID or \`me\` \u2014 usernames match nothing)`
    );
  }
  if (flags["--page"]?.length) {
    parts.push(`--page ${flags["--page"].join(", ")}`);
  }
  if (flags["--search"]) {
    parts.push(`--search ${flags["--search"]}`);
  }
  if (flags["--content-id"]?.length) {
    parts.push(`--content-id ${flags["--content-id"].join(", ")}`);
  }
  if (parts.length > 0) {
    output_manager_default.log(`Filters: ${parts.join(" \xB7 ")}`);
  }
}
function countLine(count, status) {
  return `${count}${statusWord(status)} comment${count === 1 ? "" : "s"}`;
}
var SCOPE_FLAG_NAMES = /* @__PURE__ */ new Set([
  "--scope",
  "-S",
  "--project",
  "-p",
  "--team",
  "-T"
]);
function argvFlagTokens(client) {
  return stripSensitiveAuthArgs(client.argv.slice(3));
}
function scopeFlagsSuffix(client) {
  const tokens = argvFlagTokens(client);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const name = token.split("=")[0];
    if (!SCOPE_FLAG_NAMES.has(name)) {
      continue;
    }
    out.push(token);
    if (!token.includes("=") && i + 1 < tokens.length) {
      out.push(tokens[++i]);
    }
  }
  return out.length > 0 ? ` ${out.join(" ")}` : "";
}
function nextPageFlagsSuffix(client) {
  const tokens = argvFlagTokens(client);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith("-")) {
      continue;
    }
    const name = token.split("=")[0];
    if (name === "--next" || name === "-N") {
      if (!token.includes("=") && i + 1 < tokens.length) {
        i++;
      }
      continue;
    }
    out.push(token);
    if (!token.includes("=") && i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
      out.push(tokens[++i]);
    }
  }
  return out.length > 0 ? ` ${out.join(" ")}` : "";
}
function shellSafe(value) {
  if (/^[A-Za-z0-9._/-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}
async function printEmptyState(client, scope, focus, params, status, flags) {
  let probe;
  try {
    probe = await listThreads(client, scope.teamId, {
      ...params,
      branch: void 0,
      cursor: void 0,
      limit: 20
    });
  } catch {
    output_manager_default.log(`No${statusWord(status)} comments on ${focus.value}.`);
    return;
  }
  const branches = /* @__PURE__ */ new Map();
  for (const thread of probe.threads) {
    const branch = thread.branch ?? "(no branch)";
    branches.set(branch, (branches.get(branch) ?? 0) + 1);
  }
  if (branches.size === 0) {
    output_manager_default.log(
      `No${statusWord(status)} comments in ${scope.projectName ?? "this project"} on any branch.`
    );
    printActiveFilters(flags);
    return;
  }
  output_manager_default.log(`No${statusWord(status)} comments on ${focus.value}.`);
  const suffix = probe.pagination.nextCursor ? "+" : "";
  const scopeSuffix = scopeFlagsSuffix(client);
  if (branches.size === 1) {
    const [branch, count] = [...branches.entries()][0];
    output_manager_default.log(
      `${count}${suffix}${statusWord(status)} on ${import_chalk.default.bold(branch)} \u2014 run ${getCommandName(`comments --branch ${shellSafe(branch)}${scopeSuffix}`)}`
    );
    return;
  }
  const total = [...branches.values()].reduce((a, b) => a + b, 0);
  output_manager_default.log(
    `${total}${suffix}${statusWord(status)} on other branches \u2014 run ${getCommandName(`comments --all-branches${scopeSuffix}`)}`
  );
}
async function list(client, telemetry, defaultInvocation) {
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(listSubcommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    return handleCommentsParseError(err, "list");
  }
  const flags = parsedArgs.flags;
  const expectedPositionals = defaultInvocation ? 1 : 2;
  if (parsedArgs.args.length > expectedPositionals) {
    output_manager_default.error(
      `Unknown ${defaultInvocation ? "subcommand" : "argument"} "${parsedArgs.args[expectedPositionals]}". Run \`vercel comments --help\` for usage.`
    );
    return 1;
  }
  const formatResult = validateJsonOutput(flags);
  if (!formatResult.valid) {
    output_manager_default.error(formatResult.error);
    return 1;
  }
  const jsonOutput = formatResult.jsonOutput;
  telemetry.trackCliOptionProject(flags["--project"]);
  telemetry.trackCliOptionBranch(flags["--branch"]);
  telemetry.trackCliFlagAllBranches(flags["--all-branches"]);
  telemetry.trackCliOptionStatus(flags["--status"]);
  telemetry.trackCliOptionPage(flags["--page"]);
  telemetry.trackCliOptionAuthor(flags["--author"]);
  telemetry.trackCliOptionContentId(flags["--content-id"]);
  telemetry.trackCliOptionSearch(flags["--search"]);
  telemetry.trackCliOptionLimit(flags["--limit"]);
  telemetry.trackCliOptionNext(flags["--next"]);
  telemetry.trackCliOptionFormat(flags["--format"]);
  const status = validateStatus(flags["--status"]);
  if (!status) {
    return outputError(
      client,
      jsonOutput,
      "INVALID_STATUS",
      `Invalid --status "${flags["--status"]}". Valid values: unresolved, resolved, all.`
    );
  }
  const limitResult = validateIntegerRangeWithDefault(flags["--limit"], {
    flag: "--limit",
    min: 1,
    max: 100,
    defaultValue: 20
  });
  if (!limitResult.valid) {
    return handleValidationError(limitResult, jsonOutput, client);
  }
  if (flags["--branch"] && flags["--all-branches"]) {
    return outputError(
      client,
      jsonOutput,
      "MUTUAL_EXCLUSIVITY",
      "Cannot specify both --branch and --all-branches."
    );
  }
  const scope = await resolveCommentsScope(client, {
    project: flags["--project"],
    requireProject: true,
    jsonOutput
  });
  if (typeof scope === "number") {
    return scope;
  }
  let focus;
  let branchFilter;
  if (flags["--branch"] && flags["--branch"].length > 0) {
    branchFilter = flags["--branch"];
    focus = { value: branchFilter.join(", "), source: "flag" };
  } else if (!flags["--all-branches"] && scope.linked) {
    const inferred = inferBranch(client.cwd);
    if (inferred) {
      focus = inferred;
      branchFilter = [inferred.value];
    }
  }
  const authors = await resolveAuthors(client, flags["--author"]);
  const params = {
    projectId: scope.projectId,
    branch: branchFilter,
    status: status === "all" ? void 0 : status,
    page: flags["--page"],
    author: authors,
    contentId: flags["--content-id"],
    search: flags["--search"],
    limit: limitResult.value,
    cursor: flags["--next"]
  };
  if (!jsonOutput) {
    output_manager_default.spinner("Fetching comments\u2026");
  }
  let response;
  try {
    response = await listThreads(client, scope.teamId, params);
  } catch (err) {
    if (isAPIError(err)) {
      return outputError(
        client,
        jsonOutput,
        err.code || "API_ERROR",
        err.serverMessage || `API error (${err.status}).`
      );
    }
    throw err;
  } finally {
    output_manager_default.stopSpinner();
  }
  const threads = response.threads ?? [];
  const nextCursor = response.pagination?.nextCursor ?? null;
  if (jsonOutput) {
    const envelope = {
      scope: {
        teamId: scope.teamId,
        ...scope.teamSlug && { teamSlug: scope.teamSlug },
        ...scope.projectId && { projectId: scope.projectId },
        ...scope.projectName && { projectName: scope.projectName },
        ...focus && focus.source !== "flag" && { inferredBranch: focus.value }
      },
      filters: {
        ...status !== "all" && { status },
        ...focus && { branch: { value: focus.value, source: focus.source } }
      },
      pagination: { nextCursor },
      threads
    };
    client.stdout.write(`${JSON.stringify(envelope, null, 2)}
`);
    return 0;
  }
  const branchLabel = focus ? focus.value : "all branches";
  output_manager_default.log(
    `Comments in ${import_chalk.default.bold(scope.projectName ?? scope.projectId ?? "")} \xB7 ${branchLabel}`
  );
  if (threads.length === 0) {
    if (focus) {
      await printEmptyState(client, scope, focus, params, status, flags);
    } else {
      output_manager_default.log(
        `No${statusWord(status)} comments in ${scope.projectName ?? "this project"}.`
      );
      printActiveFilters(flags);
    }
    return 0;
  }
  output_manager_default.print("\n");
  for (const thread of threads) {
    output_manager_default.print(`${renderThreadRow(thread, { showBranch: !focus })}

`);
  }
  output_manager_default.log(countLine(threads.length, status));
  output_manager_default.log(
    `To read a thread, run ${getCommandName(`comments inspect <id>${scopeFlagsSuffix(client)}`)}`
  );
  if (nextCursor) {
    output_manager_default.log(
      `To display the next page, run ${getCommandName(`comments${nextPageFlagsSuffix(client)} --next ${nextCursor}`)}`
    );
  }
  return 0;
}
export {
  list as default
};
