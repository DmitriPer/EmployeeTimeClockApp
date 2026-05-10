import { defineStore } from 'pinia';
import { ref } from 'vue';

interface TimeEntry {
  id: string;
  clockInUtc: string;
  clockOutUtc: string | null;
  grossMinutes: number | null;
  paidMinutes: number | null;
}

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<TimeEntry[]>([]);
  const isLoading = ref<boolean>(false);

  function setEntries(newEntries: TimeEntry[]): void {
    entries.value = newEntries;
  }

  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  return { entries, isLoading, setEntries, setLoading };
});
