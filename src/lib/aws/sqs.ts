import {
  ListQueuesCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  PurgeQueueCommand,
  DeleteMessageCommand,
  type QueueAttributeName,
} from "@aws-sdk/client-sqs";
import { clients, normalizeQueueUrl } from "./clients";
import { getConfig } from "@/store/config";

export type QueueSummary = {
  url: string;
  name: string;
  isFifo: boolean;
};

export async function listQueues(): Promise<QueueSummary[]> {
  const { sqs } = clients();
  const res = await sqs.send(new ListQueuesCommand({ MaxResults: 1000 }));
  return (res.QueueUrls ?? []).map((u) => {
    const url = normalizeQueueUrl(u);
    const name = url.split("/").pop() ?? url;
    return { url, name, isFifo: name.endsWith(".fifo") };
  });
}

export async function getQueueAttributes(url: string) {
  const { sqs } = clients();
  const res = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: url,
      AttributeNames: ["All" as QueueAttributeName],
    })
  );
  return res.Attributes ?? {};
}

export type CreateQueueInput = {
  name: string;
  fifo: boolean;
  contentBasedDeduplication?: boolean;
  visibilityTimeout?: number;
  delaySeconds?: number;
  messageRetentionPeriod?: number;
  dlqArn?: string;
  maxReceiveCount?: number;
};

export async function createQueue(input: CreateQueueInput) {
  const { sqs } = clients();
  const attrs: Record<string, string> = {};
  if (input.fifo) {
    attrs.FifoQueue = "true";
    if (input.contentBasedDeduplication) attrs.ContentBasedDeduplication = "true";
  }
  if (input.visibilityTimeout != null)
    attrs.VisibilityTimeout = String(input.visibilityTimeout);
  if (input.delaySeconds != null) attrs.DelaySeconds = String(input.delaySeconds);
  if (input.messageRetentionPeriod != null)
    attrs.MessageRetentionPeriod = String(input.messageRetentionPeriod);
  if (input.dlqArn && input.maxReceiveCount) {
    attrs.RedrivePolicy = JSON.stringify({
      deadLetterTargetArn: input.dlqArn,
      maxReceiveCount: input.maxReceiveCount,
    });
  }
  const name = input.fifo && !input.name.endsWith(".fifo") ? `${input.name}.fifo` : input.name;
  const res = await sqs.send(
    new CreateQueueCommand({ QueueName: name, Attributes: attrs })
  );
  return res.QueueUrl!;
}

export async function deleteQueue(url: string) {
  const { sqs } = clients();
  await sqs.send(new DeleteQueueCommand({ QueueUrl: url }));
}

export async function purgeQueue(url: string) {
  const { sqs } = clients();
  await sqs.send(new PurgeQueueCommand({ QueueUrl: url }));
}

export type SendMessageInput = {
  url: string;
  body: string;
  delaySeconds?: number;
  messageGroupId?: string;
  messageDeduplicationId?: string;
  attributes?: Record<string, string>;
};

export async function sendMessage(input: SendMessageInput) {
  const { sqs } = clients();
  const messageAttributes = input.attributes
    ? Object.fromEntries(
        Object.entries(input.attributes).map(([k, v]) => [
          k,
          { DataType: "String", StringValue: v },
        ])
      )
    : undefined;
  return sqs.send(
    new SendMessageCommand({
      QueueUrl: input.url,
      MessageBody: input.body,
      DelaySeconds: input.delaySeconds,
      MessageGroupId: input.messageGroupId,
      MessageDeduplicationId: input.messageDeduplicationId,
      MessageAttributes: messageAttributes,
    })
  );
}

export async function receiveMessages(url: string, max = 10) {
  const { sqs } = clients();
  const res = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: url,
      MaxNumberOfMessages: max,
      AttributeNames: ["All"],
      MessageAttributeNames: ["All"],
      WaitTimeSeconds: 0,
      VisibilityTimeout: 1,
    })
  );
  return res.Messages ?? [];
}

export async function deleteMessage(url: string, receiptHandle: string) {
  const { sqs } = clients();
  await sqs.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: receiptHandle }));
}

/** Peek messages WITHOUT consuming them via LocalStack debug endpoint. */
export type PeekedMessage = {
  MessageId: string;
  Body: string;
  Attributes?: Record<string, string>;
  MessageAttributes?: Record<string, { DataType: string; StringValue?: string }>;
};

export async function peekMessages(queueUrl: string): Promise<PeekedMessage[]> {
  const { endpoint } = getConfig();
  const url = `${endpoint.replace(/\/$/, "")}/_aws/sqs/messages?QueueUrl=${encodeURIComponent(
    queueUrl
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Peek failed: HTTP ${res.status}`);
  const text = await res.text();
  // LocalStack returns XML for this endpoint (SQS-compatible).
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const msgs = Array.from(doc.getElementsByTagName("Message"));
  return msgs.map((m) => {
    const get = (tag: string) => m.getElementsByTagName(tag)[0]?.textContent ?? "";
    const attrs: Record<string, string> = {};
    Array.from(m.getElementsByTagName("Attribute")).forEach((a) => {
      const name = a.getElementsByTagName("Name")[0]?.textContent ?? "";
      const value = a.getElementsByTagName("Value")[0]?.textContent ?? "";
      if (name) attrs[name] = value;
    });
    return {
      MessageId: get("MessageId"),
      Body: get("Body"),
      Attributes: attrs,
    };
  });
}
