import {
  ListEventBusesCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand,
  PutEventsCommand,
  DescribeRuleCommand,
  type Rule,
  type Target,
} from "@aws-sdk/client-eventbridge";
import { clients } from "./clients";

export async function listBuses() {
  const res = await clients().events.send(new ListEventBusesCommand({}));
  return res.EventBuses ?? [];
}
export async function listRules(busName?: string): Promise<Rule[]> {
  const res = await clients().events.send(new ListRulesCommand({ EventBusName: busName }));
  return res.Rules ?? [];
}
export async function describeRule(name: string, busName?: string) {
  return clients().events.send(new DescribeRuleCommand({ Name: name, EventBusName: busName }));
}
export async function listTargets(rule: string, busName?: string): Promise<Target[]> {
  const res = await clients().events.send(
    new ListTargetsByRuleCommand({ Rule: rule, EventBusName: busName })
  );
  return res.Targets ?? [];
}
export async function putEvent(opts: {
  source: string;
  detailType: string;
  detail: string;
  busName?: string;
}) {
  return clients().events.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: opts.source,
          DetailType: opts.detailType,
          Detail: opts.detail,
          EventBusName: opts.busName,
        },
      ],
    })
  );
}
