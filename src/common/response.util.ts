export function ok<T>(message: string, data?: T) {
  return { status: 'success', message, data };
}
