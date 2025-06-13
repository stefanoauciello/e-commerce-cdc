interface ProcessEnv {
  [key: string]: string | undefined;
}
declare var process: { env: ProcessEnv };
