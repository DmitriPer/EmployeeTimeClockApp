<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  fetchCorrectionQueue, reviewCorrectionRequest,
  fetchRetroactiveQueue, reviewRetroactiveRequest,
  fetchOvertimeQueue, reviewOvertime,
  fetchFlaggedSessions, reviewFlaggedSession,
  type CorrectionRequest, type PendingRetroactiveRequest,
  type OvertimeRequest, type FlaggedSession,
} from '../../api/manager.js';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import { getApiErrorMessage } from '../../api/utils.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import ReviewCard from '../../components/data/ReviewCard.vue';
import AsyncSection from '../../components/ui/AsyncSection.vue';
import StatusBadge from '../../components/ui/StatusBadge.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import TimeInput from '../../components/TimeInput.vue';

type Tab = 'edits' | 'missed' | 'overtime' | 'flagged';

const activeTab = ref<Tab>('edits');

const corrections = ref<CorrectionRequest[]>([]);
const retroactives = ref<PendingRetroactiveRequest[]>([]);
const overtimeRequests = ref<OvertimeRequest[]>([]);
const sessions = ref<FlaggedSession[]>([]);

const { loading, error, run: runLoad } =
  useAsyncData<[CorrectionRequest[], PendingRetroactiveRequest[], OvertimeRequest[], FlaggedSession[]]>();
const reviewingId = ref<number | null>(null);

const fixingSession = ref<FlaggedSession | null>(null);
const fixingOpen = ref(false);
const breakEndInput = ref('');
const fixing = ref(false);
const fixError = ref<string | null>(null);

onMounted(async () => {
  const result = await runLoad(
    () => Promise.all([fetchCorrectionQueue(), fetchRetroactiveQueue(), fetchOvertimeQueue(), fetchFlaggedSessions()]),
    'Failed to load approvals.',
  );
  if (result !== null) {
    [corrections.value, retroactives.value, overtimeRequests.value, sessions.value] = result;
  }
});

function switchTab(tab: Tab): void {
  activeTab.value = tab;
  reviewingId.value = null;
  error.value = null;
}

async function submitCorrectionReview(req: CorrectionRequest, action: 'APPROVED' | 'REJECTED', note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewCorrectionRequest(req.id, action, note);
    corrections.value = corrections.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Failed to submit review.');
  }
}

async function submitRetroactiveReview(req: PendingRetroactiveRequest, action: 'APPROVED' | 'REJECTED', note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewRetroactiveRequest(req.id, action, note);
    retroactives.value = retroactives.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Failed to submit review.');
  }
}

async function handleOvertimeReview(req: OvertimeRequest, action: 'APPROVED' | 'REJECTED', note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewOvertime(req.id, action, note);
    overtimeRequests.value = overtimeRequests.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch {
    error.value = 'Failed to submit review.';
  }
}

const pendingFlagged = computed(() => sessions.value.filter((s) => !s.reviewedAt).length);

const modalSubtitle = computed(() =>
  fixingSession.value
    ? `${fixingSession.value.employeeName} · ${formatDate(fixingSession.value.clockInAt)}`
    : '',
);

function openFixModal(s: FlaggedSession): void {
  fixingSession.value = s;
  breakEndInput.value = s.breakEndAt ? formatTime(s.breakEndAt) : '';
  fixError.value = null;
  fixingOpen.value = true;
}

function closeFixModal(): void {
  fixingOpen.value = false;
  fixingSession.value = null;
  fixError.value = null;
}

async function submitFix(): Promise<void> {
  if (!fixingSession.value) return;
  if (!breakEndInput.value) { fixError.value = 'Break end time is required.'; return; }
  fixing.value = true;
  fixError.value = null;
  try {
    await reviewFlaggedSession(fixingSession.value.timeEntryId, breakEndInput.value);
    const idx = sessions.value.findIndex((x) => x.timeEntryId === fixingSession.value!.timeEntryId);
    if (idx !== -1) {
      sessions.value[idx] = { ...sessions.value[idx], breakEndAt: new Date().toISOString(), reviewedAt: new Date().toISOString(), reviewedByName: 'You' };
    }
    closeFixModal();
  } catch (e: unknown) {
    fixError.value = getApiErrorMessage(e, 'Failed to save correction.');
  } finally {
    fixing.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Approvals</h1>

    <div class="flex gap-1 border-b border-gray-200">
      <button
        v-for="tab in (['edits', 'missed', 'overtime', 'flagged'] as Tab[])" :key="tab"
        @click="switchTab(tab)"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        {{ tab === 'edits' ? 'Entry Edits' : tab === 'missed' ? 'Missed Days' : tab === 'overtime' ? 'Overtime' : 'Flagged' }}
        <span
          v-if="(tab === 'edits' && corrections.length) || (tab === 'missed' && retroactives.length) || (tab === 'overtime' && overtimeRequests.length) || (tab === 'flagged' && pendingFlagged)"
          class="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700"
        >
          {{ tab === 'edits' ? corrections.length : tab === 'missed' ? retroactives.length : tab === 'overtime' ? overtimeRequests.length : pendingFlagged }}
        </span>
      </button>
    </div>

    <AsyncSection :loading="loading" :error="error">
      <!-- Entry Edits -->
      <template v-if="activeTab === 'edits'">
        <div v-if="corrections.length === 0" class="text-sm text-gray-400">No pending edit requests.</div>
        <div v-else class="space-y-3">
          <ReviewCard
            v-for="req in corrections" :key="req.id"
            :title="req.employeeName" :subtitle="`(${req.employeeId})`"
            :timestamp="`Submitted ${formatDate(req.createdAt)}`"
            :reviewing="reviewingId === req.id"
            note-placeholder="Manager note (optional)"
            @start-review="reviewingId = req.id" @cancel="reviewingId = null"
            @approve="(note) => submitCorrectionReview(req, 'APPROVED', note)"
            @reject="(note) => submitCorrectionReview(req, 'REJECTED', note)"
          >
            <div class="grid grid-cols-2 gap-4 rounded bg-gray-50 p-3 text-xs text-gray-600">
              <div>
                <p class="mb-1 font-medium text-gray-500">Current</p>
                <p>{{ formatTime(req.currentClockInAt) }} — {{ req.currentClockOutAt ? formatTime(req.currentClockOutAt) : 'open' }}</p>
              </div>
              <div>
                <p class="mb-1 font-medium text-blue-600">Requested</p>
                <p>{{ formatTime(req.requestedClockInAt) }} — {{ req.requestedClockOutAt ? formatTime(req.requestedClockOutAt) : '—' }}</p>
                <p v-if="req.requestedBreaks && req.requestedBreaks.length > 0" class="mt-1 text-gray-500">
                  Breaks: {{ req.requestedBreaks.map(b => `${b.start}–${b.end}`).join(', ') }}
                </p>
              </div>
            </div>
            <p class="text-sm italic text-gray-700">"{{ req.employeeNote }}"</p>
          </ReviewCard>
        </div>
      </template>

      <!-- Missed Days -->
      <template v-else-if="activeTab === 'missed'">
        <div v-if="retroactives.length === 0" class="text-sm text-gray-400">No pending missed-day requests.</div>
        <div v-else class="space-y-3">
          <ReviewCard
            v-for="req in retroactives" :key="req.id"
            :title="req.employeeName" :subtitle="`(${req.employeeId})`"
            :timestamp="`Submitted ${req.createdAt.slice(0, 10)}`"
            :header-badge="{ variant: 'custom', tone: 'gray', label: req.date }"
            :reviewing="reviewingId === req.id"
            note-placeholder="Manager note (optional)"
            @start-review="reviewingId = req.id" @cancel="reviewingId = null"
            @approve="(note) => submitRetroactiveReview(req, 'APPROVED', note)"
            @reject="(note) => submitRetroactiveReview(req, 'REJECTED', note)"
          >
            <div class="rounded bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <p>{{ req.clockInTime }} — {{ req.clockOutTime }}</p>
              <p v-if="req.breaks && req.breaks.length" class="text-gray-400">
                Breaks: {{ req.breaks.map(b => `${b.start}–${b.end}`).join(', ') }}
              </p>
            </div>
            <p class="text-sm italic text-gray-700">"{{ req.employeeNote }}"</p>
          </ReviewCard>
        </div>
      </template>

      <!-- Overtime -->
      <template v-else-if="activeTab === 'overtime'">
        <div v-if="overtimeRequests.length === 0" class="text-sm text-gray-400">No pending overtime requests.</div>
        <div v-else class="space-y-3">
          <ReviewCard
            v-for="req in overtimeRequests" :key="req.id"
            :title="req.employeeName" :subtitle="`(${req.employeeId})`"
            :timestamp="`${formatDate(req.clockInAt)} — ${formatTime(req.clockInAt)} to ${req.clockOutAt ? formatTime(req.clockOutAt) : '—'}`"
            :header-badge="{ variant: 'custom', tone: 'amber', label: `+${formatMinutes(req.overtimeMinutes)} OT` }"
            :reviewing="reviewingId === req.id"
            @start-review="reviewingId = req.id" @cancel="reviewingId = null"
            @approve="(note) => handleOvertimeReview(req, 'APPROVED', note)"
            @reject="(note) => handleOvertimeReview(req, 'REJECTED', note)"
          />
        </div>
      </template>

      <!-- Flagged Sessions -->
      <template v-else-if="activeTab === 'flagged'">
        <div v-if="sessions.length === 0" class="text-sm text-gray-400">No flagged sessions.</div>
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
                <td class="px-4 py-2"><StatusBadge variant="custom" tone="amber" label="Break auto-closed" /></td>
                <td class="px-4 py-2 text-xs text-gray-500">{{ s.correctionCount > 0 ? `${s.correctionCount} correction(s)` : '—' }}</td>
                <td class="px-4 py-2">
                  <StatusBadge v-if="s.reviewedAt" variant="break-fixed" :label="`Reviewed by ${s.reviewedByName}`" />
                  <BaseButton v-else size="sm" @click="openFixModal(s)">Fix</BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </AsyncSection>
  </div>

  <!-- Fix Break End Modal -->
  <BaseModal v-model:open="fixingOpen" title="Fix Break End Time" :subtitle="modalSubtitle" @close="closeFixModal">
    <div v-if="fixingSession" class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Clock In
        <input :value="formatTime(fixingSession.clockInAt)" type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500" />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Clock Out
        <input :value="fixingSession.clockOutAt ? formatTime(fixingSession.clockOutAt) : '—'" type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500" />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Break Start
        <input :value="fixingSession.breakStartAt ? formatTime(fixingSession.breakStartAt) : '—'" type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500" />
      </label>
      <label class="flex flex-col gap-1 text-xs font-medium text-blue-700">
        Break End *
        <TimeInput v-model="breakEndInput" input-class="rounded border border-blue-300 px-2 py-1.5 text-sm" />
      </label>
    </div>
    <div v-if="fixError" class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ fixError }}
    </div>
    <template #footer>
      <button @click="closeFixModal" class="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
        Cancel
      </button>
      <BaseButton variant="success" @click="submitFix" :loading="fixing">
        {{ fixing ? 'Saving…' : 'Save' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
