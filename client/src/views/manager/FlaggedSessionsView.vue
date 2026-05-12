<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchFlaggedSessions, reviewFlaggedSession, type FlaggedSession } from '../../api/manager.js';
import TimeInput from '../../components/TimeInput.vue';

const sessions = ref<FlaggedSession[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const fixingSession = ref<FlaggedSession | null>(null);
const breakEndInput = ref('');
const submitting = ref(false);
const formError = ref<string | null>(null);

const TZ = 'Asia/Jerusalem';

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
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

function openModal(s: FlaggedSession): void {
  fixingSession.value = s;
  breakEndInput.value = s.breakEndAt ? formatTime(s.breakEndAt) : '';
  formError.value = null;
}

function closeModal(): void {
  fixingSession.value = null;
  formError.value = null;
}

async function submitFix(): Promise<void> {
  if (!fixingSession.value) return;
  if (!breakEndInput.value) {
    formError.value = 'Break end time is required.';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    await reviewFlaggedSession(fixingSession.value.timeEntryId, breakEndInput.value);
    const idx = sessions.value.findIndex((x) => x.timeEntryId === fixingSession.value!.timeEntryId);
    if (idx !== -1) {
      sessions.value[idx] = {
        ...sessions.value[idx],
        breakEndAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedByName: 'You',
      };
    }
    closeModal();
  } catch (e: any) {
    formError.value = e?.response?.data?.error?.message ?? 'Failed to save correction.';
  } finally {
    submitting.value = false;
  }
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
            <th class="px-4 py-2">Corrections</th>
            <th class="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="s in sessions" :key="s.timeEntryId" class="hover:bg-gray-50">
            <td class="px-4 py-2">
              <span class="font-medium text-gray-800">{{ s.employeeName }}</span>
              <span class="ml-1 text-xs text-gray-400">{{ s.employeeId }}</span>
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatDate(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ s.clockOutAt ? formatTime(s.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2">
              <span class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Break auto-closed
              </span>
            </td>
            <td class="px-4 py-2 text-xs text-gray-500">
              {{ s.correctionCount > 0 ? `${s.correctionCount} correction(s)` : '—' }}
            </td>
            <td class="px-4 py-2">
              <span
                v-if="s.reviewedAt"
                class="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
              >
                Reviewed by {{ s.reviewedByName }}
              </span>
              <button
                v-else
                @click="openModal(s)"
                class="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"
              >
                Fix
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Fix Modal -->
  <Teleport to="body">
    <div
      v-if="fixingSession"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p class="font-semibold text-gray-800">Fix Break End Time</p>
            <p class="mt-0.5 text-xs text-gray-400">
              {{ fixingSession.employeeName }} · {{ formatDate(fixingSession.clockInAt) }}
            </p>
          </div>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1 text-xs text-gray-500">
              Clock In
              <input
                :value="formatTime(fixingSession.clockInAt)"
                type="text" disabled
                class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-gray-500">
              Clock Out
              <input
                :value="fixingSession.clockOutAt ? formatTime(fixingSession.clockOutAt) : '—'"
                type="text" disabled
                class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-gray-500">
              Break Start
              <input
                :value="fixingSession.breakStartAt ? formatTime(fixingSession.breakStartAt) : '—'"
                type="text" disabled
                class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs font-medium text-blue-700">
              Break End *
              <TimeInput v-model="breakEndInput" input-class="rounded border border-blue-300 px-2 py-1.5 text-sm" />
            </label>
          </div>

          <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ formError }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            @click="closeModal"
            class="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="submitFix"
            :disabled="submitting"
            class="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {{ submitting ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
