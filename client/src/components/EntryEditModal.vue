<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { HistoryEntry } from '../api/history.js';
import type { CorrectionRequestResult, BreakInput } from '../api/correctionRequests.js';
import {
  submitCorrectionRequest,
  updateCorrectionRequest,
  deleteCorrectionRequest,
} from '../api/correctionRequests.js';
import TimeInput from './TimeInput.vue';
import { formatTime as toTimeInput } from '../utils/format.js';
import { getApiErrorMessage } from '../api/utils.js';

const props = defineProps<{
  entry: HistoryEntry;
  existing: CorrectionRequestResult | null;
}>();

const emit = defineEmits<{
  close: [];
  submitted: [result: CorrectionRequestResult];
  deleted: [];
}>();

function initBreaks(): BreakInput[] {
  if (props.existing?.breaks) return props.existing.breaks.map((b) => ({ ...b }));
  return props.entry.breaks
    .filter((b) => b.breakEndAt !== null)
    .map((b) => ({ start: toTimeInput(b.breakStartAt), end: toTimeInput(b.breakEndAt!) }));
}

const clockIn = ref(
  props.existing ? toTimeInput(props.existing.requestedClockIn) : toTimeInput(props.entry.clockInAt),
);
const clockOut = ref(
  props.existing?.requestedClockOut
    ? toTimeInput(props.existing.requestedClockOut)
    : props.entry.clockOutAt
    ? toTimeInput(props.entry.clockOutAt)
    : '',
);
const breaks = ref<BreakInput[]>(initBreaks());
const employeeNote = ref(props.existing?.employeeNote ?? '');
const saving = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);
const dialogRef = ref<HTMLElement | null>(null);

function getFocusable(): HTMLElement[] {
  return dialogRef.value
    ? Array.from(
        dialogRef.value.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      )
    : [];
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { emit('close'); return; }
  if (e.key !== 'Tab') return;
  const focusable = getFocusable();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  getFocusable()[0]?.focus();
});

onUnmounted(() => document.removeEventListener('keydown', onKeydown));

function addBreak(): void {
  breaks.value.push({ start: '', end: '' });
}

function removeBreak(idx: number): void {
  breaks.value.splice(idx, 1);
}

async function handleSubmit(): Promise<void> {
  if (!employeeNote.value.trim()) {
    error.value = 'A note explaining the reason is required.';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const breaksPayload = breaks.value.length > 0 ? breaks.value : undefined;
    let result: CorrectionRequestResult;
    if (props.existing) {
      result = await updateCorrectionRequest(props.existing.id, {
        clockInTime: clockIn.value,
        clockOutTime: clockOut.value || undefined,
        breaks: breaksPayload,
        employeeNote: employeeNote.value,
      });
    } else {
      result = await submitCorrectionRequest({
        timeEntryId: props.entry.id,
        clockInTime: clockIn.value,
        clockOutTime: clockOut.value || undefined,
        breaks: breaksPayload,
        employeeNote: employeeNote.value,
      });
    }
    emit('submitted', result);
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Failed to submit request.');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!props.existing) return;
  deleting.value = true;
  error.value = null;
  try {
    await deleteCorrectionRequest(props.existing.id);
    emit('deleted');
  } catch {
    error.value = 'Failed to cancel request.';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="emit('close')"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4"
    >
      <h2 id="modal-title" class="text-base font-semibold text-gray-800">
        {{ existing ? 'Edit Pending Request' : 'Request Entry Edit' }}
      </h2>

      <!-- Current entry reference -->
      <div class="rounded bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Current entry:
        {{ toTimeInput(entry.clockInAt) }} —
        {{ entry.clockOutAt ? toTimeInput(entry.clockOutAt) : 'open' }}
      </div>

      <!-- Clock in / out -->
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm text-gray-600">
          Clock In
          <TimeInput v-model="clockIn" :required="true" input-class="rounded border px-2 py-1 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-gray-600">
          Clock Out
          <TimeInput v-model="clockOut" input-class="rounded border px-2 py-1 text-sm" />
        </label>
      </div>

      <!-- Breaks -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-600">Breaks</p>
        <div v-for="(b, i) in breaks" :key="i" class="flex items-center gap-2">
          <TimeInput v-model="b.start" input-class="rounded border px-2 py-1 text-sm w-28" />
          <span class="text-gray-400 text-xs">to</span>
          <TimeInput v-model="b.end" input-class="rounded border px-2 py-1 text-sm w-28" />
          <button @click="removeBreak(i)" aria-label="Remove break"
            class="text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
        <button @click="addBreak"
          class="text-xs text-blue-600 hover:underline">
          + Add break
        </button>
      </div>

      <!-- Note -->
      <label class="flex flex-col gap-1 text-sm text-gray-600">
        Reason <span class="text-red-500">*</span>
        <textarea
          v-model="employeeNote"
          rows="2"
          maxlength="1000"
          placeholder="Explain why this entry needs correction"
          class="rounded border border-gray-300 px-2 py-1 text-sm resize-none"
        />
      </label>

      <div v-if="error" class="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 pt-1">
        <button
          @click="handleSubmit"
          :disabled="saving"
          class="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : existing ? 'Update' : 'Submit' }}
        </button>
        <button
          @click="emit('close')"
          class="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          v-if="existing"
          @click="handleDelete"
          :disabled="deleting"
          class="ml-auto text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {{ deleting ? 'Cancelling…' : 'Cancel Request' }}
        </button>
      </div>
    </div>
  </div>
</template>
