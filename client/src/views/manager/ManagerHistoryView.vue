<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchHistory, type HistoryEntry } from '../../api/history.js';
import { fetchUsers, type UserSummary } from '../../api/users.js';
import { useAuthStore } from '../../stores/auth.js';
import { downloadExport, type ExportFormat } from '../../api/export.js';
import HistoryTable from '../../components/data/HistoryTable.vue';
import AsyncSection from '../../components/ui/AsyncSection.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
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

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
      <label class="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-2">
        Employee
        <select v-model="selectedUserId" @change="onUserChange" class="rounded border border-gray-300 px-2 py-1 text-sm">
          <option v-for="u in users" :key="u.id" :value="u.id">
            {{ u.name }} ({{ u.employeeId }})
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-2">
        From
        <input v-model="from" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-2">
        To
        <input v-model="to" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <BaseButton @click="loadHistory">Load</BaseButton>
      <div class="sm:ml-auto flex flex-wrap gap-2">
        <BaseButton
          v-for="fmt in (['csv', 'xls', 'pdf'] as ExportFormat[])"
          :key="fmt"
          variant="secondary" size="sm" :disabled="exporting" class="uppercase"
          @click="handleExport(fmt)"
        >{{ fmt }}</BaseButton>
      </div>
    </div>

    <AsyncSection :loading="loading" :error="error" :empty="entries.length === 0" empty-text="Select an employee and press Load.">
      <HistoryTable :entries="entries" :show-notes="true" />
    </AsyncSection>
  </div>
</template>
