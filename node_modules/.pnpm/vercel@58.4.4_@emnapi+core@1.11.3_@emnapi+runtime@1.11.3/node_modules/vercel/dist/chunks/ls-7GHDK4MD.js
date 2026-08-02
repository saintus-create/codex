import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  formatCustomAlertMetric,
  formatCustomAlertTrigger,
  formatRuleScope,
  isCustomAlertRule,
  parseCustomAlertQuery,
  renderAlertTable
} from "./chunk-EBLH23AQ.js";
import {
  emitRulesArgParseError,
  handleRulesApiError,
  parseRulesFlagsAndScope,
  rulesCollectionPath
} from "./chunk-Y5GTPWXB.js";
import "./chunk-YDUINEII.js";
import {
  formatGranularity
} from "./chunk-5AJPMLDV.js";
import "./chunk-A3NYPUKZ.js";
import {
  normalizeRepeatableStringFilters
} from "./chunk-BUZRVER7.js";
import "./chunk-FGDKMNEN.js";
import {
  truncateEnd
} from "./chunk-RQ7H43CJ.js";
import {
  validateJsonOutput
} from "./chunk-XPKWKPWA.js";
import {
  rulesLsSubcommand
} from "./chunk-4UYKSYKQ.js";
import "./chunk-KT4XXKJK.js";
import "./chunk-4CCY5OPH.js";
import "./chunk-ECCWJHC6.js";
import {
  AGENT_REASON,
  outputAgentError
} from "./chunk-TJJ562C5.js";
import {
  printError
} from "./chunk-KBEX5MYS.js";
import {
  parseArguments
} from "./chunk-XLKFJPMT.js";
import {
  getFlagsSpecification,
  isAPIError
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

// src/commands/alerts/rules/ls.ts
var import_chalk = __toESM(require_source(), 1);
function getCustomAlertRuleDetails(rule) {
  const customAlert = rule.customAlert;
  if (!isCustomAlertRule(rule) || !customAlert) {
    return "";
  }
  const metric = formatCustomAlertMetric(customAlert);
  const trigger = formatCustomAlertTrigger(customAlert);
  const min = typeof customAlert.minThreshold === "number" ? `min ${customAlert.minThreshold}` : void 0;
  const granularity = formatGranularity(
    parseCustomAlertQuery(customAlert.queryJsonString).granularity
  );
  const interval = granularity ? `every ${granularity}` : void 0;
  return [metric, trigger, min, interval].filter(Boolean).join("; ");
}
function ruleMatchesTypes(rule, types) {
  if (types.length === 0) {
    return true;
  }
  return rule.alertTypes?.some((alertType) => types.includes(alertType.type)) || types.includes("custom_alert") && isCustomAlertRule(rule);
}
function getRuleScope(rule) {
  return formatRuleScope(rule.projectId, {
    projectIdMaxLength: 24,
    filterMaxLength: 24
  });
}
function printRules(rules) {
  const showDetails = rules.some((rule) => getCustomAlertRuleDetails(rule));
  const headers = [
    "Name",
    "Rule id",
    "Scope",
    ...showDetails ? ["Details"] : []
  ].map((h) => import_chalk.default.cyan(h));
  const rows = [
    headers,
    ...rules.map((rule) => {
      const row = [
        import_chalk.default.bold(truncateEnd(rule.name || "-", 44)),
        import_chalk.default.dim(rule.id || "-"),
        getRuleScope(rule)
      ];
      if (showDetails) {
        row.push(truncateEnd(getCustomAlertRuleDetails(rule) || "-", 72));
      }
      return row;
    })
  ];
  output_manager_default.print(`
${renderAlertTable(rows, 2)}
`);
}
async function ls(client, argv) {
  let parsedArgs;
  try {
    parsedArgs = parseArguments(
      argv,
      getFlagsSpecification(rulesLsSubcommand.options)
    );
  } catch (e) {
    emitRulesArgParseError(client, e, "alerts rules ls --project <name-or-id>");
    printError(e);
    return 1;
  }
  const flags = parsedArgs.flags;
  const fr = validateJsonOutput(flags);
  if (!fr.valid) {
    outputAgentError(
      client,
      {
        status: "error",
        reason: AGENT_REASON.INVALID_ARGUMENTS,
        message: fr.error
      },
      1
    );
    output_manager_default.error(fr.error);
    return 1;
  }
  const scope = await parseRulesFlagsAndScope(
    client,
    {
      "--project": flags["--project"],
      "--all": flags["--all"]
    },
    fr.jsonOutput,
    "alerts rules ls"
  );
  if (typeof scope === "number") {
    return scope;
  }
  const path = rulesCollectionPath(scope);
  output_manager_default.spinner("Fetching alert rules...");
  try {
    const rules = await client.fetch(path);
    const types = normalizeRepeatableStringFilters(flags["--type"]);
    const filteredRules = rules.filter((rule) => ruleMatchesTypes(rule, types));
    if (fr.jsonOutput) {
      client.stdout.write(
        `${JSON.stringify({ rules: filteredRules }, null, 2)}
`
      );
    } else if (filteredRules.length === 0) {
      output_manager_default.log("No alert rules found for this scope.");
    } else {
      printRules(filteredRules);
    }
    return 0;
  } catch (err) {
    if (isAPIError(err)) {
      return handleRulesApiError(client, err, fr.jsonOutput);
    }
    throw err;
  } finally {
    output_manager_default.stopSpinner();
  }
}
export {
  ls as default
};
