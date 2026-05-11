<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchHistory, updateNote, type HistoryEntry } from '../api/history.js';
import { downloadExport, type ExportFormat } from '../api/export.js';

const entries = ref<HistoryEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const from = ref('');
const to = ref('');
const editingNoteId = ref<number | null>(null);
const noteInput = ref('');

onMounted(() => loadHistory());

async function loadHistory(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    entries.value = await fetchHistory({
      from: from.value || undefined,
      to: to.value || undefined,
    });
  } catch {
    error.value = 'Failed to load history.';
  } finally {
    loading.value = false;
  }
}

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

function formatMinutes(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
}

function startEditNote(entry: HistoryEntry): void {
  editingNoteId.value = entry.id;
  noteInput.value = entry.employeeNote ?? '';
}

const dateRangeError = computed(() =>
  from.value && to.value && from.value > to.value ? '"From" date must be before "To" date.' : null,
);

const exporting = ref(false);

async function handleExport(format: ExportFormat): Promise<void> {
  exporting.value = true;
  error.value = null;
  try {
    await downloadExport({ from: from.value || undefined, to: to.value || undefined, format });
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
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">My History</h1>

    <!-- Filters -->
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        From
        <input v-model="from" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        To
        <input v-model="to" type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <button
        @click="loadHistory"
        :disabled="!!dateRangeError"
        class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Apply
      </button>
      <span v-if="dateRangeError" class="text-xs text-red-600">{{ dateRangeError }}</span>
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
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="entry in entries" :key="entry.id" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-gray-700">{{ formatDate(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ entry.clockOutAt ? formatTime(entry.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.grossMinutes) }}</td>
            <td class="px-4 py-2" :class="entry.excessBreakMinutes > 0 ? 'text-amber-600 font-medium' : 'text-gray-700'">
              {{ formatMinutes(entry.totalBreakMinutes) }}
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.paidMinutes) }}</td>
            <td class="px-4 py-2">
              <span v-if="entry.isFlagged" class="mr-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Flagged</span>
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
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
