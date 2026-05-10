export class ServerlessUnavailableError extends Error {
  readonly feature: string;

  constructor(feature: string) {
    super(
      `Feature "${feature}" is not available in serverless deployment mode. Run in long-running mode to enable.`,
    );
    this.name = 'ServerlessUnavailableError';
    this.feature = feature;
  }
}
