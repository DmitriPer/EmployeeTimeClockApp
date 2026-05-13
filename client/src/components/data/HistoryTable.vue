<script setup lang="ts">
import { ref } from 'vue';
import type { HistoryEntryDto } from '@app/shared';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import BreakPopover from '../BreakPopover.vue';
import StatusBadge from '../ui/StatusBadge.vue';
import BaseButton from '../ui/BaseButton.vue';

const props = withDefaults(defineProps<{
  entries: HistoryEntryDto[];
  showEmployee?: boolean;
  showNotes?: boolean;
  showEditAction?: boolean;
  noteEditable?: boolean;
  editableEntry?: (entry: HistoryEntryDto) => boolean;
}>(), {
  showEmployee: false,
  showNotes: true,
  showEditAction: false,
  noteEditable: false,
  editableEntry: () => true,
});

const emit = defineEmits<{
  (e: 'edit', entry: HistoryEntryDto): void;
  (e: 'save-note', entry: HistoryEntryDto, note: string): void;
}>();

const editingNoteId = ref<number | null>(null);
const noteDraft = ref('');

function startEditingNote(entry: HistoryEntryDto): void {
  editingNoteId.value = entry.id;
  noteDraft.value = entry.employeeNote ?? '';
}

function commitNote(entry: HistoryEntryDto): void {
  emit('save-note', entry, noteDraft.value);
  editingNoteId.value = null;
}

function cancelNote(): void {
  editingNoteId.value = null;
}

function otVariant(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}
</script>

<template>
  <!-- Card list (< lg) -->
  <div class="lg:hidden space-y-2">
    <article
      v-for="entry in entries"
      :key="entry.id"
      class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <header class="flex items-start justify-between gap-2">
        <div>
          <p class="text-sm font-medium text-gray-900">{{ formatDate(entry.clockInAt) }}</p>
          <p v-if="showEmployee" class="text-xs text-gray-500">—</p>
        </div>
        <div class="flex flex-wrap justify-end gap-1">
          <StatusBadge v-if="entry.isRetroactive"   variant="retroactive"  />
          <StatusBadge v-if="entry.isCorrected"     variant="corrected"    />
          <StatusBadge v-if="entry.isFlagged"       variant="flagged"      />
          <StatusBadge v-if="entry.isBreakReviewed" variant="break-fixed"  />
          <StatusBadge
            v-if="entry.overtimeRequest"
            :variant="otVariant(entry.overtimeRequest.status)"
            :label="`OT ${entry.overtimeRequest.status.toLowerCase()}`"
          />
        </div>
      </header>
      <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt class="text-gray-500">In</dt>
        <dd class="text-right text-gray-800">{{ formatTime(entry.clockInAt) }}</dd>
        <dt class="text-gray-500">Out</dt>
        <dd class="text-right text-gray-800">{{ entry.clockOutAt ? formatTime(entry.clockOutAt) : '—' }}</dd>
        <dt class="text-gray-500">Gross</dt>
        <dd class="text-right text-gray-800">{{ formatMinutes(entry.grossMinutes) }}</dd>
        <dt class="text-gray-500">Paid</dt>
        <dd class="text-right text-gray-800">{{ formatMinutes(entry.paidMinutes) }}</dd>
        <dt class="text-gray-500">Break</dt>
        <dd class="text-right text-gray-800">
          <BreakPopover
            :breaks="entry.breaks"
            :total-minutes="entry.totalBreakMinutes"
            :excess-minutes="entry.excessBreakMinutes"
            :is-auto-closed-break="entry.isAutoClosedBreak && !entry.isBreakReviewed"
          />
        </dd>
      </dl>
      <details v-if="showNotes" class="mt-3 text-xs">
        <summary class="cursor-pointer text-gray-500">Notes</summary>
        <template v-if="noteEditable && editingNoteId === entry.id">
          <textarea
            v-model="noteDraft"
            rows="2"
            class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <div class="mt-1 flex gap-1">
            <BaseButton size="sm" variant="primary" @click="commitNote(entry)">Save</BaseButton>
            <BaseButton size="sm" variant="ghost"   @click="cancelNote">Cancel</BaseButton>
          </div>
        </template>
        <template v-else>
          <p class="mt-1 text-gray-700">{{ entry.employeeNote || '—' }}</p>
          <button
            v-if="noteEditable"
            class="mt-1 text-blue-600 hover:underline"
            @click="startEditingNote(entry)"
          >Edit</button>
        </template>
      </details>
      <div v-if="entry.pendingCorrection?.status === 'PENDING'" class="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
        Pending: {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
        {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
      </div>
      <div v-if="entry.pendingCorrection?.status === 'REJECTED'" class="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
        Rejected: {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
        {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
      </div>
      <div v-if="showEditAction && entry.clockOutAt && editableEntry(entry)" class="mt-3 flex justify-end">
        <BaseButton
          size="sm"
          :variant="entry.pendingCorrection?.status === 'PENDING' ? 'secondary' : 'primary'"
          @click="emit('edit', entry)"
        >
          {{ entry.pendingCorrection?.status === 'PENDING' ? 'Pending Edit' : 'Request Edit' }}
        </BaseButton>
      </div>
    </article>
  </div>

  <!-- Desktop table (≥ lg) -->
  <div class="hidden lg:block overflow-x-auto rounded border border-gray-200">
    <table class="min-w-full text-sm">
      <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
        <tr>
          <th v-if="showEmployee" class="px-4 py-2">Employee</th>
          <th class="px-4 py-2">Date</th>
          <th class="px-4 py-2">Clocked In</th>
          <th class="px-4 py-2">Clocked Out</th>
          <th class="px-4 py-2">Total Work Time</th>
          <th class="px-4 py-2">Total Break Time</th>
          <th class="px-4 py-2">Net Work Time</th>
          <th class="px-4 py-2">Status</th>
          <th v-if="showNotes" class="px-4 py-2">Notes</th>
          <th v-if="showEditAction" class="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        <template v-for="entry in entries" :key="entry.id">
          <tr class="hover:bg-gray-50">
            <td v-if="showEmployee" class="px-4 py-2 text-gray-500 text-xs">—</td>
            <td class="px-4 py-2 text-gray-700">{{ formatDate(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(entry.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ entry.clockOutAt ? formatTime(entry.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.grossMinutes) }}</td>
            <td class="px-4 py-2">
              <BreakPopover
                :breaks="entry.breaks"
                :total-minutes="entry.totalBreakMinutes"
                :excess-minutes="entry.excessBreakMinutes"
                :is-auto-closed-break="entry.isAutoClosedBreak && !entry.isBreakReviewed"
              />
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatMinutes(entry.paidMinutes) }}</td>
            <td class="px-4 py-2 space-x-1">
              <StatusBadge v-if="entry.isRetroactive"   variant="retroactive"  />
              <StatusBadge v-if="entry.isCorrected"     variant="corrected"    />
              <StatusBadge v-if="entry.isFlagged"       variant="flagged"      />
              <StatusBadge v-if="entry.isBreakReviewed" variant="break-fixed"  />
              <StatusBadge
                v-if="entry.overtimeRequest"
                :variant="otVariant(entry.overtimeRequest.status)"
                :label="`OT ${entry.overtimeRequest.status.toLowerCase()}`"
              />
            </td>
            <td v-if="showNotes" class="px-4 py-2 text-xs text-gray-600">
              <template v-if="noteEditable && editingNoteId === entry.id">
                <textarea v-model="noteDraft" rows="2" class="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                <div class="mt-1 flex gap-1">
                  <BaseButton size="sm" variant="primary" @click="commitNote(entry)">Save</BaseButton>
                  <BaseButton size="sm" variant="ghost" @click="cancelNote">Cancel</BaseButton>
                </div>
              </template>
              <template v-else>
                <span>{{ entry.employeeNote || '—' }}</span>
                <button
                  v-if="noteEditable"
                  class="ml-2 text-blue-600 hover:underline"
                  @click="startEditingNote(entry)"
                >Edit</button>
              </template>
            </td>
            <td v-if="showEditAction" class="px-4 py-2 text-right">
              <BaseButton
                v-if="entry.clockOutAt && editableEntry(entry)"
                size="sm"
                :variant="entry.pendingCorrection?.status === 'PENDING' ? 'secondary' : 'primary'"
                @click="emit('edit', entry)"
              >
                {{ entry.pendingCorrection?.status === 'PENDING' ? 'Pending Edit' : 'Request Edit' }}
              </BaseButton>
            </td>
          </tr>
          <tr v-if="entry.pendingCorrection?.status === 'PENDING'" :key="`cr-${entry.id}`" class="bg-amber-50">
            <td :colspan="10" class="px-4 py-1.5 text-xs text-amber-700">
              Edit requested:
              {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
              {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
              &mdash; "{{ entry.pendingCorrection.employeeNote }}"
            </td>
          </tr>
          <tr v-if="entry.pendingCorrection?.status === 'REJECTED'" :key="`cr-rej-${entry.id}`" class="bg-red-50">
            <td :colspan="10" class="px-4 py-1.5 text-xs text-red-700">
              Edit rejected:
              {{ formatTime(entry.pendingCorrection.requestedClockInAt) }} —
              {{ entry.pendingCorrection.requestedClockOutAt ? formatTime(entry.pendingCorrection.requestedClockOutAt) : '—' }}
              &mdash; "{{ entry.pendingCorrection.employeeNote }}"
              <span v-if="entry.pendingCorrection.managerNote">
                &mdash; Manager: "{{ entry.pendingCorrection.managerNote }}"
              </span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
