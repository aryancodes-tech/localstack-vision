import {
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clients } from "./clients";

export async function listBuckets() {
  const { s3 } = clients();
  const res = await s3.send(new ListBucketsCommand({}));
  return res.Buckets ?? [];
}
export async function createBucket(name: string) {
  await clients().s3.send(new CreateBucketCommand({ Bucket: name }));
}
export async function deleteBucket(name: string) {
  await clients().s3.send(new DeleteBucketCommand({ Bucket: name }));
}
export async function listObjects(bucket: string, prefix?: string): Promise<{
  objects: _Object[];
  prefixes: string[];
}> {
  const res = await clients().s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: "/",
      MaxKeys: 1000,
    })
  );
  return {
    objects: res.Contents ?? [],
    prefixes: (res.CommonPrefixes ?? []).map((p) => p.Prefix!).filter(Boolean),
  };
}
export async function uploadObject(bucket: string, key: string, file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  await clients().s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: file.type || "application/octet-stream",
    })
  );
}
export async function deleteObject(bucket: string, key: string) {
  await clients().s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function headObject(bucket: string, key: string) {
  return clients().s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
export async function presignDownload(bucket: string, key: string) {
  const url = await getSignedUrl(
    clients().s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 }
  );
  return url;
}
export async function getObjectText(bucket: string, key: string): Promise<string> {
  const res = await clients().s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return (res.Body as { transformToString: (e: string) => Promise<string> }).transformToString(
    "utf-8"
  );
}
