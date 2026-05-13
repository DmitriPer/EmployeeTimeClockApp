<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchHistory, type HistoryEntry } from '../../api/history.js';
import { fetchUsers, type UserSummary } from '../../api/users.js';
import { useAuthStore } from '../../stores/auth.js';
import { downloadExport, type ExportFormat } from '../../api/export.js';
import BreakPopover from '../../components/BreakPopover.vue';
import StatusBadge from '../../components/ui/StatusBadge.vue';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import { useAsyncData } from '../../composables/useAsyncData.js';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const users = ref<UserSummary[]>([]);
const selectedUserId = ref<number | null>(null);
const entries = ref<HistoryEntry[]>([]);
const { loading, error, run: runHistory } = useAsyncData<HistoryEntry[]>();
const from = ref('');
const to = ref('');

onMounted(async () => {
  try {
    users.value = await fetchUsers();
    const queryId = route.query.userId ? Number(route.query.userId) : null;
    const fromQuery = queryId && users.value.some((u) => u.id === queryId) ? queryId : null;
    const self = users.value.find((u) => u.id === authStore.user?.id);
    selectedUserId.value = fromQuery ?? self?.id ?? users.value[0]?.id ?? null;
    if (selectedUserId.value) await loadHistory();
  } catch {
    error.value = 'Failed to load users.';
  }
});

function onUserChange(): void {
  router.replace({ query: { ...route.query, userId: selectedUserId.value ?? undefined } });
  loadHistory();
}

async function loadHistory(): Promise<void> {
  if (!selectedUserId.value) return;
  const uid = selectedUserId.value;
  const result = await runHistory(
    () => fetchHistory({ userId: uid, from: from.value || undefined, to: to.value || undefined }),
    'Failed to load history.',
  );
  if (result !== null) entries.value = result;
}

const exporting = ref(false);

async function handleExport(format: ExportFormat): Promise<void> {
  exporting.value = true;
  error.value = null;
  try {
    await downloadExport({
      from: from.value || undefined,
      to: to.value || undefined,
      format,
      employeeId: selectedUserId.value ?? undefined,
    });
  } catch {
    error.value = 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Employee History</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        Employee
        <select v-model="selectedUserId" @change="onUserChange" class="rounded border border-gray-300 px-2 py-1 text-sm">
          <option v-for="u in users" :key="u.id" :value="u.id">
            {{ u.name }} ({{ u.employeeId }})
          </option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        From
        <input v-model="from" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        To
        <input v-model="to" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <button @click="loadHistory" class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
        Load
      </button>
      <div class="ml-auto flex gap-2">
        <button
          v-for="fmt in (['csv', 'xls', 'pdf'] as ExportFormat[])"
          :key="fmt"
          :disabled="exporting"
          @click="handleExport(fmt)"
          class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 uppercase"
        >
          {{ fmt }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>
    <div v-else-if="entries.length === 0" class="text-sm text-gray-400">
      Select an employee and press Load.
    </div>

    <!-- Table -->
    <div v-if="entries.length > 0" class="overflow-x-auto rounded border border-gray-200">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-4 py-2">Date</th>
            <th class="px-4 py-2">Clocked In</th>
            <th class="px-4 py-2">Clocked Out</th>
            <th class="px-4 py-2">Total Work Time</th>
            <th class="px-4 py-2">Total Break Time</th>
            <th class="px-4 py-2">Net Work Time</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="entry in entries" :key="entry.id" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-gray-700">{{ formatDate(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ entry.clockOutAt ? formatTime(entry.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.grossMinutes) }}</td>
            <td class="px-4 py-2">
              <BreakPopover
                :breaks="entry.breaks"
                :total-minutes="entry.totalBreakMinutes"
                :excess-minutes="entry.excessBreakMinutes"
                :is-auto-closed-break="entry.isAutoClosedBreak"
              />
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.paidMinutes) }}</td>
            <td class="px-4 py-2 space-x-1">
              <StatusBadge v-if="entry.isFlagged" variant="flagged" />
              <StatusBadge v-if="entry.isBreakReviewed" variant="break-fixed" />
              <StatusBadge
                v-if="entry.overtimeRequest"
                :variant="entry.overtimeRequest.status === 'APPROVED' ? 'approved' : entry.overtimeRequest.status === 'REJECTED' ? 'rejected' : 'pending'"
                :label="`OT ${entry.overtimeRequest.status.toLowerCase()}`"
              />
            </td>
            <td class="px-4 py-2 text-xs text-gray-500">{{ entry.employeeNote || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
