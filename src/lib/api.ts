const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function apiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
