import {
  ListFunctionsCommand,
  GetFunctionCommand,
  InvokeCommand,
  DeleteFunctionCommand,
  type FunctionConfiguration,
} from "@aws-sdk/client-lambda";
import { clients } from "./clients";

export async function listFunctions(): Promise<FunctionConfiguration[]> {
  const res = await clients().lambda.send(new ListFunctionsCommand({ MaxItems: 1000 }));
  return res.Functions ?? [];
}
export async function getFunction(name: string) {
  return clients().lambda.send(new GetFunctionCommand({ FunctionName: name }));
}
export async function deleteFunction(name: string) {
  await clients().lambda.send(new DeleteFunctionCommand({ FunctionName: name }));
}
export type InvokeResult = {
  statusCode?: number;
  payload: string;
  durationMs: number;
  functionError?: string;
  logTail?: string;
};
export async function invokeFunction(
  name: string,
  payload: string,
  invocationType: "RequestResponse" | "Event" = "RequestResponse"
): Promise<InvokeResult> {
  const t0 = performance.now();
  const res = await clients().lambda.send(
    new InvokeCommand({
      FunctionName: name,
      Payload: new TextEncoder().encode(payload || "{}"),
      InvocationType: invocationType,
      LogType: "Tail",
    })
  );
  const decoder = new TextDecoder();
  const body = res.Payload ? decoder.decode(res.Payload) : "";
  let logTail: string | undefined;
  if (res.LogResult) {
    try {
      logTail = atob(res.LogResult);
    } catch {
      /* */
    }
  }
  return {
    statusCode: res.StatusCode,
    payload: body,
    durationMs: Math.round(performance.now() - t0),
    functionError: res.FunctionError,
    logTail,
  };
}
