import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AwsConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

type ConfigState = AwsConfig & {
  set: (patch: Partial<AwsConfig>) => void;
  reset: () => void;
};

const DEFAULTS: AwsConfig = {
  endpoint: "http://localstack.oceaninfra.localhost",
  region: "eu-central-1",
  accessKeyId: "test",
  secretAccessKey: "test",
  forcePathStyle: true,
};

export const useConfig = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    // Bumped key so stale localStorage from the old us-east-1/localhost:4566 defaults is ignored.
    { name: "localstack-vision-config-v2" }
  )
);

export const getConfig = (): AwsConfig => {
  const s = useConfig.getState();
  return {
    endpoint: s.endpoint,
    region: s.region,
    accessKeyId: s.accessKeyId,
    secretAccessKey: s.secretAccessKey,
    forcePathStyle: s.forcePathStyle,
  };
};
