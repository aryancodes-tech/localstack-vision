import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { getEffectiveAwsEndpoint } from "@/lib/aws/effective-endpoint";
import { getConfig, useConfig, type AwsConfig } from "@/store/config";

function key(c: AwsConfig) {
  return `${c.endpoint}|${c.region}|${c.accessKeyId}|${c.forcePathStyle}`;
}

let cache: { key: string; clients: ReturnType<typeof build> } | null = null;

function build(c: AwsConfig) {
  const common = {
    endpoint: getEffectiveAwsEndpoint(c),
    region: c.region,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  };
  return {
    s3: new S3Client({ ...common, forcePathStyle: c.forcePathStyle }),
    sqs: new SQSClient(common),
    lambda: new LambdaClient(common),
    events: new EventBridgeClient(common),
    scheduler: new SchedulerClient(common),
  };
}

export function clients() {
  const c = getConfig();
  const k = key(c);
  if (!cache || cache.key !== k) {
    cache = { key: k, clients: build(c) };
  }
  return cache.clients;
}

// Invalidate cached clients when config changes
useConfig.subscribe(() => {
  cache = null;
});

// Rewrite LocalStack-internal queue URLs to the configured endpoint so the
// browser can reach them. LocalStack returns URLs like
// http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/queue
export function normalizeQueueUrl(url: string): string {
  try {
    const cfg = getConfig();
    const u = new URL(url);
    const ep = new URL(getEffectiveAwsEndpoint(cfg));
    u.protocol = ep.protocol;
    u.host = ep.host;
    return u.toString();
  } catch {
    return url;
  }
}
