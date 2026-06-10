export class InstagramFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramFetchError';
  }
}
