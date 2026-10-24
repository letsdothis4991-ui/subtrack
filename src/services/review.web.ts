// No store review prompt on the web app.
export function noteAppOpen() {}
export async function maybeAskForReview(): Promise<boolean> {
  return false;
}
