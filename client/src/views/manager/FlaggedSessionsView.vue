<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchFlaggedSessions, type FlaggedSession } from '../../api/manager.js';

const sessions = ref<FlaggedSession[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    sessions.value = await fetchFlaggedSessions();
  } catch {
    error.value = 'Failed to load flagged sessions.';
  } finally {
    loading.value = false;
  }
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Flagged Sessions</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <div v-else-if="sessions.length === 0" class="text-sm text-gray-400">
      No flagged sessions.
    </div>

    <div v-else class="overflow-x-auto rounded border border-gray-200">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-4 py-2">Employee</th>
            <th class="px-4 py-2">Date</th>
            <th class="px-4 py-2">In</th>
            <th class="px-4 py-2">Out</th>
            <th class="px-4 py-2">Reason</th>
            <th class="px-4 py-2">Employee Note</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="s in sessions" :key="s.id" class="hover:bg-gray-50">
            <td class="px-4 py-2">
              <span class="font-medium text-gray-800">{{ s.employeeName }}</span>
              <span class="ml-1 text-xs text-gray-400">{{ s.employeeId }}</span>
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatDate(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ s.clockOutAt ? formatTime(s.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2">
              <span v-if="s.isAutoClosedBreak" class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Break auto-closed
              </span>
            </td>
            <td class="px-4 py-2 text-xs text-gray-500">{{ s.employeeNote || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
