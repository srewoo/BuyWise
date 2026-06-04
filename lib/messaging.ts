import { runAdvisor, type AdviseProgress, type AdviseResult, type AdviseOptions } from '@/lib/advisor';

/**
 * Single entry point the UI uses to get a verdict.
 *
 * The side panel is an extension page, so it shares the extension's host_permissions and can
 * fetch OpenAI / Reddit / YouTube directly (no CORS, no background round-trip) and it stays
 * alive while open. So we run the advisor inline here. Routing this through the background SW
 * later would only require changing this one function.
 */
export function requestAdvice(
  query: string,
  onProgress: (p: AdviseProgress) => void,
  signal?: AbortSignal,
  opts?: AdviseOptions,
): Promise<AdviseResult> {
  return runAdvisor(query, onProgress, signal, opts);
}
