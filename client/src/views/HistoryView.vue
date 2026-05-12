<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchHistory, updateNote, type HistoryEntry } from '../api/history.js';
import { downloadExport, type ExportFormat } from '../api/export.js';
import { getCorrectionRequestForEntry, type CorrectionRequestResult } from '../api/correctionRequests.js';
import EntryEditModal from '../components/EntryEditModal.vue';
import BreakPopover from '../components/BreakPopover.vue';
import RetroactiveRequestsSection from '../components/RetroactiveRequestsSection.vue';
import { isCurrentMonthEntry } from '../utils/periodLock.js';

const TZ = 'Asia/Jerusalem';

const entries = ref<HistoryEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const editingNoteId = ref<number | null>(null);
const noteInput = ref('');
const modalEntry = ref<HistoryEntry | null>(null);
const modalExisting = ref<CorrectionRequestResult | null>(null);

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonthIdx = ref(now.getMonth()); // 0-indexed

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
    ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(today)
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
  loading.value = true;
  error.value = null;
  try {
    const range = getMonthRange();
    entries.value = await fetchHistory({ from: range.from, to: range.to });
  } catch {
    error.value = 'Failed to load history.';
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

function formatMinutes(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
}

function startEditNote(entry: HistoryEntry): void {
  editingNoteId.value = entry.id;
  noteInput.value = entry.employeeNote ?? '';
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

async function saveNote(entry: HistoryEntry): Promise<void> {
  try {
    await updateNote(entry.id, noteInput.value || null);
    entry.employeeNote = noteInput.value || null;
    editingNoteId.value = null;
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

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded border border-gray-200">
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
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <template v-for="entry in entries" :key="entry.id">
            <tr class="hover:bg-gray-50">
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
              <td class="px-4 py-2">
                <span v-if="entry.isRetroactive" class="mr-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Retroactive</span>
                <span v-if="entry.isCorrected" class="mr-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Corrected</span>
                <span v-if="entry.isFlagged" class="mr-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Flagged</span>
                <span v-if="entry.isBreakReviewed" class="mr-1 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">Break fixed</span>
                <span v-if="entry.overtimeRequest" class="inline-block rounded-full px-2 py-0.5 text-xs"
                  :class="{
                    'bg-yellow-100 text-yellow-700': entry.overtimeRequest.status === 'PENDING',
                    'bg-green-100 text-green-700': entry.overtimeRequest.status === 'APPROVED',
                    'bg-red-100 text-red-700': entry.overtimeRequest.status === 'REJECTED',
                  }">
                  OT {{ entry.overtimeRequest.status.toLowerCase() }}
                </span>
              </td>
              <td class="px-4 py-2">
                <template v-if="editingNoteId === entry.id">
                  <input
                    v-model="noteInput"
                    type="text"
                    maxlength="1000"
                    class="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                    @keyup.enter="saveNote(entry)"
                    @keyup.escape="editingNoteId = null"
                  />
                  <div class="mt-1 flex gap-2">
                    <button @click="saveNote(entry)" class="text-xs text-blue-600 hover:underline">Save</button>
                    <button @click="editingNoteId = null" class="text-xs text-gray-400 hover:underline">Cancel</button>
                  </div>
                </template>
                <template v-else>
                  <span class="text-xs text-gray-500">{{ entry.employeeNote || '' }}</span>
                  <button @click="startEditNote(entry)" class="ml-1 text-xs text-gray-400 hover:text-blue-600">
                    {{ entry.employeeNote ? 'Edit' : 'Add note' }}
                  </button>
                </template>
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  v-if="entry.clockOutAt && isCurrentMonthEntry(entry.clockInAt)"
                  @click="openEditModal(entry)"
                  class="text-xs"
                  :class="entry.pendingCorrection?.status === 'PENDING'
                    ? 'text-amber-600 hover:text-amber-800'
                    : 'text-blue-600 hover:text-blue-800'"
                >
                  {{ entry.pendingCorrection?.status === 'PENDING' ? 'Pending Edit' : 'Request Edit' }}
                </button>
              </td>
            </tr>
            <!-- Pending correction note -->
            <tr v-if="entry.pendingCorrection?.status === 'PENDING'" :key="`cr-${entry.id}`" class="bg-amber-50">
              <td colspan="9" class="px-4 py-1.5 text-xs text-amber-700">
                Edit requested:
                {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
                {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
                &mdash; "{{ entry.pendingCorrection.employeeNote }}"
              </td>
            </tr>
            <!-- Rejected correction note -->
            <tr v-if="entry.pendingCorrection?.status === 'REJECTED'" :key="`cr-rej-${entry.id}`" class="bg-red-50">
              <td colspan="9" class="px-4 py-1.5 text-xs text-red-700">
                Edit rejected:
                {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
                {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
                &mdash; "{{ entry.pendingCorrection.employeeNote }}"
                <span v-if="entry.pendingCorrection.managerNote"> &mdash; Manager: "{{ entry.pendingCorrection.managerNote }}"</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Retroactive entry requests -->
    <hr class="border-gray-200" />
    <RetroactiveRequestsSection :month="`${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`" />

    <!-- Edit modal -->
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