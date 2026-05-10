import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ClockStatus } from '@app/shared';

export const useTimeclockStore = defineStore('timeclock', () => {
  const currentStatus = ref<ClockStatus>(ClockStatus.NOT_CLOCKED_IN);
  const sessionStart = ref<string | null>(null);

  function setStatus(status: ClockStatus, start: string | null = null): void {
    currentStatus.value = status;
    sessionStart.value = start;
  }

  function reset(): void {
    currentStatus.value = ClockStatus.NOT_CLOCKED_IN;
    sessionStart.value = null;
  }

  return { currentStatus, sessionStart, setStatus, reset };
});
