import type { RuntimeRequest } from './types';
export const hasExtensionRuntime = () => typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
export async function sendRuntime<T = unknown>(request: RuntimeRequest): Promise<T> {
  if (!hasExtensionRuntime()) throw new Error('Cette action nécessite l’extension installée.');
  const response = await chrome.runtime.sendMessage(request);
  if (!response?.ok) throw new Error(response?.error ?? 'Action impossible.');
  return response.value as T;
}
