<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchHistory, updateNote, type HistoryEntry } from '../api/history.js';
import { downloadExport, type ExportFormat } from '../api/export.js';
import { getCorrectionRequestForEntry, type CorrectionRequestResult } from '../api/correctionRequests.js';
import EntryEditModal from '../components/EntryEditModal.vue';
import RetroactiveRequestsSection from '../components/RetroactiveRequestsSection.vue';
import HistoryTable from '../components/data/HistoryTable.vue';
import { isCurrentMonthEntry } from '../utils/periodLock.js';
import { APP_TIMEZONE } from '../config/app.js';
import { useAsyncData } from '../composables/useAsyncData.js';

const entries = ref<HistoryEntry[]>([]);
const { loading, error, run: runHistory } = useAsyncData<HistoryEntry[]>();
const modalEntry = ref<HistoryEntry | null>(null);
const modalExisting = ref<CorrectionRequestResult | null>(null);

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonthIdx = ref(now.getMonth());

const monthLabel = computed(() =>
  new Date(selectedYear.value, selectedMonthIdx.value, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  }),
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

    <!-- Month navigation -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1">
        <button
          @click="prevMonth"
          class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >‹</button>
        <span class="w-36 text-center text-sm font-medium text-gray-700">{{ monthLabel }}</span>
        <button
          @click="nextMonth"
          class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >›</button>
      </div>
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

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <div v-else-if="entries.length === 0" class="text-sm text-gray-400">No entries found.</div>

    <HistoryTable
      v-else
      :entries="entries"
      :show-edit-action="true"
      :note-editable="true"
      :editable-entry="(e) => isCurrentMonthEntry(e.clockInAt)"
      @edit="openEditModal"
      @save-note="handleSaveNote"
    />

    <hr class="border-gray-200" />
    <RetroactiveRequestsSection :month="`${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`" />

    <EntryEditModal
      v-if="modalEntry"
      :entry="modalEntry"
      :existing="modalExisting"
      @close="modalEntry = null"
      @submitted="handleModalSubmitted"
      @deleted="handleModalDeleted"
    />
  </div>
</template>
