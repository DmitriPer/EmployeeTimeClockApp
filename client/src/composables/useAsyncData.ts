import { ref, type Ref } from 'vue';
import { getApiErrorMessage } from '../api/utils.js';

export interface AsyncDataState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  run: (fn: () => Promise<T>, fallback?: string) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncData<T>(initial: T | null = null): AsyncDataState<T> {
  const data = ref(initial) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function run(
    fn: () => Promise<T>,
    fallback = 'Something went wrong.',
  ): Promise<T | null> {
    loading.value = true;
    error.value = null;
    try {
      const result = await fn();
      data.value = result;
      return result;
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e, fallback);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    data.value = initial;
    loading.value = false;
    error.value = null;
  }

  return { data, loading, error, run, reset };
}
