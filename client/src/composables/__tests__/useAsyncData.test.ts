import { describe, it, expect } from 'vitest';
import { useAsyncData } from '../useAsyncData.js';

describe('useAsyncData', () => {
  it('sets data and clears loading on success', async () => {
    const { data, loading, error, run } = useAsyncData<number>();
    const result = await run(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(data.value).toBe(42);
    expect(error.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it('captures error message and clears loading on failure', async () => {
    const { data, error, loading, run } = useAsyncData<number>();
    const result = await run(() => Promise.reject(new Error('boom')), 'fallback');
    expect(result).toBeNull();
    expect(data.value).toBeNull();
    expect(error.value).toBe('boom');
    expect(loading.value).toBe(false);
  });

  it('toggles loading=true during fn execution', async () => {
    const { loading, run } = useAsyncData<number>();
    let observed = false;
    const fn = () =>
      new Promise<number>((r) => {
        observed = loading.value;
        setTimeout(() => r(1), 0);
      });
    const p = run(fn);
    expect(loading.value).toBe(true);
    await p;
    expect(observed).toBe(true);
    expect(loading.value).toBe(false);
  });

  it('reset() restores initial state', () => {
    const { data, error, loading, reset } = useAsyncData<number>(0);
    data.value = 99;
    error.value = 'x';
    loading.value = true;
    reset();
    expect(data.value).toBe(0);
    expect(error.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it('falls back to user-supplied message when error is unknown', async () => {
    const { error, run } = useAsyncData<number>();
    await run(() => Promise.reject('not-an-error'), 'fallback msg');
    expect(error.value).toBe('fallback msg');
  });
});
