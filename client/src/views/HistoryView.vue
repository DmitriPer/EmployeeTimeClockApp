<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchHistory, updateNote, type HistoryEntry } from '../api/history.js';
import { downloadExport, type ExportFormat } from '../api/export.js';
import { getCorrectionRequestForEntry, type CorrectionRequestResult } from '../api/correctionRequests.js';
import EntryEditModal from '../components/EntryEditModal.vue';
import RetroactiveRequestsSection from '../components/RetroactiveRequestsSection.vue';
import HistoryTable from '../components/data/HistoryTable.vue';
import AsyncSection from '../components/ui/AsyncSection.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import { isCurrentMonthEntry } from '../utils/periodLock.js';
import { APP_TIMEZONE } from '../config/app.js';
import { useAsyncData } from '../composables/useAsyncData.js';

type Tab = 'history' | 'retroactive';
const activeTab = ref<Tab>('history');

const entries = ref<HistoryEntry[]>([]);
const { loading, error, run: runHistory } = useAsyncData<HistoryEntry[]>();
const modalEntry = ref<HistoryEntry | null>(null);
const modalExisting = ref<CorrectionRequestResult | null>(null);

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonthIdx = ref(now.getMonth());

const monthLabel = computed(() =>
  new Date(selectedYear.value, selectedMonthIdx.value, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
);

const currentMonth = computed(() =>
  `${selectedYear.value}-${String(selectedMonthIdx.value + 1).padStart(2, '0')}`,
);

function getMonthRange(): { from: string; to: string } {
  const y = selectedYear.value;
  const m = selectedMonthIdx.value;
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const today = new Date();
  const isCurrent = y === today.getFullYear() && m === today.getMonth();
  const to = isCurrent
    ? new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(today)
    : `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
  return { from, to };
}

function prevMonth(): void {
  if (selectedMonthIdx.value === 0) { selectedMonthIdx.value = 11; selectedYear.value--; }
  else { selectedMonthIdx.value--; }
  loadHistory();
}
function nextMonth(): void {
  if (selectedMonthIdx.value === 11) { selectedMonthIdx.value = 0; selectedYear.value++; }
  else { selectedMonthIdx.value++; }
  loadHistory();
}

onMounted(() => loadHistory());

async function loadHistory(): Promise<void> {
  const range = getMonthRange();
  const result = await runHistory(
    () => fetchHistory({ from: range.from, to: range.to }),
    'Failed to load history.',
  );
  if (result !== null) entries.value = result;
}

const exporting = ref(false);
async function handleExport(format: ExportFormat): Promise<void> {
  exporting.value = true;
  error.value = null;
  try {
    const range = getMonthRange();
    await downloadExport({ from: range.from, to: range.to, format });
  } catch {
    error.value = 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

async function handleSaveNote(entry: HistoryEntry, note: string): Promise<void> {
  try {
    await updateNote(entry.id, note || null);
    entry.employeeNote = note || null;
  } catch {
    error.value = 'Failed to save note.';
  }
}

async function openEditModal(entry: HistoryEntry): Promise<void> {
  const existing = entry.pendingCorrection
    ? await getCorrectionRequestForEntry(entry.id).catch(() => null)
    : null;
  modalEntry.value = entry;
  modalExisting.value = existing;
}

function handleModalSubmitted(result: CorrectionRequestResult): void {
  if (!modalEntry.value) return;
  const entry = entries.value.find((e) => e.id === modalEntry.value!.id);
  if (entry) {
    entry.pendingCorrection = {
      id: result.id,
      status: 'PENDING',
      requestedClockInAt: result.requestedClockIn,
      requestedClockOutAt: result.requestedClockOut,
      employeeNote: result.employeeNote,
      managerNote: null,
    };
  }
  modalEntry.value = null;
}

function handleModalDeleted(): void {
  if (!modalEntry.value) return;
  const entry = entries.value.find((e) => e.id === modalEntry.value!.id);
  if (entry) entry.pendingCorrection = null;
  modalEntry.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">My History</h1>

    <!-- Tab strip -->
    <div class="flex gap-1 border-b border-gray-200">
      <button
        v-for="tab in (['history', 'retroactive'] as Tab[])" :key="tab"
        @click="activeTab = tab"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        {{ tab === 'history' ? 'History' : 'Retroactive Requests' }}
      </button>
    </div>

    <!-- History tab -->
    <template v-if="activeTab === 'history'">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1">
          <BaseButton variant="secondary" size="sm" @click="prevMonth">‹</BaseButton>
          <span class="w-36 text-center text-sm font-medium text-gray-700">{{ monthLabel }}</span>
          <BaseButton variant="secondary" size="sm" @click="nextMonth">›</BaseButton>
        </div>
        <div class="ml-auto flex flex-wrap gap-2">
          <BaseButton
            v-for="fmt in (['csv', 'xls', 'pdf'] as ExportFormat[])" :key="fmt"
            variant="secondary" size="sm" :disabled="exporting" class="uppercase"
            @click="handleExport(fmt)"
          >{{ fmt }}</BaseButton>
        </div>
      </div>

      <AsyncSection :loading="loading" :error="error" :empty="entries.length === 0" empty-text="No entries found.">
        <HistoryTable
          :entries="entries"
          :show-edit-action="true"
          :note-editable="true"
          :editable-entry="(e) => isCurrentMonthEntry(e.clockInAt)"
          @edit="openEditModal"
          @save-note="handleSaveNote"
        />
      </AsyncSection>
    </template>

    <!-- Retroactive Requests tab -->
    <template v-else>
      <RetroactiveRequestsSection :month="currentMonth" />
    </template>
  </div>

  <EntryEditModal
    v-if="modalEntry"
    :entry="modalEntry"
    :existing="modalExisting"
    @close="modalEntry = null"
    @submitted="handleModalSubmitted"
    @deleted="handleModalDeleted"
  />
</template>
