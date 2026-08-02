import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  outputError
} from "./chunk-BUZRVER7.js";
import {
  getLinkedProject,
  getProjectByNameOrId,
  getScope
} from "./chunk-4CCY5OPH.js";
import {
  printError
} from "./chunk-KBEX5MYS.js";
import {
  ProjectNotFound,
  getCommandName,
  isAPIError
} from "./chunk-SOFC4MLS.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";

// src/commands/comments/errors.ts
function handleCommentsParseError(err, subcommandName) {
  printError(err);
  if (err instanceof Error && /unknown or unexpected option: -[^-]/.test(err.message)) {
    output_manager_default.log(
      `An argument starting with "-"? Put it after \`--\`: ${getCommandName(`comments ${subcommandName} -- <arg>`)}`
    );
  }
  output_manager_default.log(
    `Run ${getCommandName(`comments ${subcommandName} --help`)} for usage.`
  );
  return 1;
}
function threadNotFoundMessage(threadId, scope) {
  return `Comment not found: ${threadId} in team ${scope.teamSlug ?? scope.teamId}. If it belongs to another team, pass --scope <team>.`;
}

// src/commands/comments/api.ts
function query(teamId, params = {}) {
  const search = new URLSearchParams({ teamId });
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        search.append(key, entry);
      }
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
}
var fetchOpts = { useCurrentTeam: false };
function listThreads(client, teamId, params) {
  return client.fetch(
    `/toolbar/threads?${query(teamId, { ...params })}`,
    fetchOpts
  );
}
function getThread(client, teamId, threadId) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}?${query(teamId)}`,
    fetchOpts
  );
}
function updateThread(client, teamId, threadId, resolved) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}?${query(teamId)}`,
    { ...fetchOpts, method: "PATCH", body: { resolved } }
  );
}
function listMessages(client, teamId, threadId, opts = {}) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}/messages?${query(teamId, { ...opts })}`,
    fetchOpts
  );
}
function addMessage(client, teamId, threadId, body) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}/messages?${query(teamId)}`,
    { ...fetchOpts, method: "POST", body }
  );
}
function updateMessage(client, teamId, threadId, messageId, body) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}?${query(teamId)}`,
    { ...fetchOpts, method: "PATCH", body }
  );
}
function deleteMessage(client, teamId, threadId, messageId) {
  return client.fetch(
    `/toolbar/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}?${query(teamId)}`,
    { ...fetchOpts, method: "DELETE" }
  );
}
function toApiErrorParts(err) {
  const apiErr = err;
  return {
    code: apiErr.code || "API_ERROR",
    message: apiErr.serverMessage || `API error (${apiErr.status ?? "unknown"}).`
  };
}

// src/commands/comments/scope.ts
import { spawnSync } from "child_process";
function scopeIsExplicit(client) {
  return client.argv.some(
    (arg) => arg === "--scope" || arg === "-S" || arg.startsWith("--scope=") || arg === "--team" || arg.startsWith("--team=") || arg === "-T"
  );
}
async function resolveCommentsScope(client, opts) {
  if (opts.urlTeamSlug && !opts.project && !scopeIsExplicit(client)) {
    return { teamId: opts.urlTeamSlug, teamSlug: opts.urlTeamSlug };
  }
  if (opts.project) {
    const { team: team2 } = await getScope(client);
    if (!team2) {
      return outputError(
        client,
        opts.jsonOutput,
        "NO_TEAM",
        "No team context found. Run `vercel switch` to select a team, or run `vercel link` in a project directory."
      );
    }
    let project;
    try {
      project = await getProjectByNameOrId(client, opts.project, team2.id);
    } catch (err) {
      if (isAPIError(err)) {
        return outputError(
          client,
          opts.jsonOutput,
          err.code || "API_ERROR",
          err.serverMessage || `API error (${err.status}).`
        );
      }
      throw err;
    }
    if (project instanceof ProjectNotFound) {
      return outputError(
        client,
        opts.jsonOutput,
        "PROJECT_NOT_FOUND",
        `Project "${opts.project}" was not found in team "${team2.slug}".`
      );
    }
    return {
      teamId: team2.id,
      teamSlug: team2.slug,
      projectId: project.id,
      projectName: project.name
    };
  }
  const linked = await getLinkedProject(client);
  if (linked.status === "error") {
    return linked.exitCode;
  }
  if (linked.status === "linked") {
    if (scopeIsExplicit(client)) {
      const { team: team2 } = await getScope(client);
      if (!team2) {
        return outputError(
          client,
          opts.jsonOutput,
          "NO_TEAM",
          "No team context found for --scope."
        );
      }
      if (team2.id !== linked.org.id) {
        if (opts.requireProject) {
          return outputError(
            client,
            opts.jsonOutput,
            "SCOPE_PROJECT_MISMATCH",
            `--scope ${team2.slug} does not match the linked project's team (${linked.org.slug}). Pass --project <name-or-id> for a project in ${team2.slug}.`
          );
        }
        return { teamId: team2.id, teamSlug: team2.slug };
      }
    }
    return {
      teamId: linked.org.id,
      teamSlug: linked.org.slug,
      projectId: linked.project.id,
      projectName: linked.project.name,
      linked: true
    };
  }
  if (opts.requireProject) {
    return outputError(
      client,
      opts.jsonOutput,
      "NOT_LINKED",
      "No linked project found. Run `vercel link` to link a project, or pass --project <name-or-id>."
    );
  }
  const { team } = await getScope(client);
  if (!team) {
    return outputError(
      client,
      opts.jsonOutput,
      "NO_TEAM",
      "No team context found. Run `vercel switch` to select a team, or run `vercel link` in a project directory."
    );
  }
  return { teamId: team.id, teamSlug: team.slug };
}
function inferBranch(cwd) {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    encoding: "utf8"
  });
  if (result.status === 0) {
    const branch = result.stdout.trim();
    if (branch && branch !== "HEAD") {
      return { value: branch, source: "git" };
    }
  }
  const ciRef = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  if (ciRef) {
    return { value: ciRef, source: "ci" };
  }
  return void 0;
}

export {
  handleCommentsParseError,
  threadNotFoundMessage,
  listThreads,
  getThread,
  updateThread,
  listMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  toApiErrorParts,
  resolveCommentsScope,
  inferBranch
};
