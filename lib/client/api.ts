/**
 * Lightweight client-side API helpers for talking to our own /api routes.
 * Centralizes the fetch boilerplate (JSON parsing, ok-checking) that was
 * previously duplicated across dashboard pages.
 *
 * - `apiGet` mirrors the common read pattern: throw on non-2xx, return parsed body.
 * - `apiSend` mirrors the common mutation pattern: never throws; returns the
 *   parsed body together with `ok`/`status` so callers can surface server errors.
 */

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export interface ApiSendResult<T> {
  ok: boolean
  status: number
  data: T
}

export async function apiSend<T = Record<string, unknown>>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown
): Promise<ApiSendResult<T>> {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  const res = await fetch(url, init)
  // Tolerate empty/non-JSON bodies (e.g. some DELETE responses).
  const data = (await res.json().catch(() => ({}))) as T
  return { ok: res.ok, status: res.status, data }
}

export const apiPost = <T = Record<string, unknown>>(url: string, body?: unknown) =>
  apiSend<T>('POST', url, body)
export const apiPut = <T = Record<string, unknown>>(url: string, body?: unknown) =>
  apiSend<T>('PUT', url, body)
export const apiDelete = <T = Record<string, unknown>>(url: string, body?: unknown) =>
  apiSend<T>('DELETE', url, body)
