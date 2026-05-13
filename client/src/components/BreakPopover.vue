<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { BreakRecord } from '../api/history.js';
import { formatTime, formatMinutes } from '../utils/format.js';

const props = defineProps<{
  breaks: BreakRecord[];
  totalMinutes: number;
  excessMinutes: number;
  isAutoClosedBreak: boolean;
}>();

const open = ref(false);
const triggerRef = ref<HTMLElement | null>(null);

const popoverStyle = ref<{ top?: string; bottom?: string; left: string }>({ left: '0px' });

function toggle(): void {
  if (!open.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popoverHeight = 220; // rough max height
    if (spaceBelow < popoverHeight) {
      popoverStyle.value = { bottom: `${window.innerHeight - rect.top + 4}px`, left: `${rect.left}px` };
    } else {
      popoverStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` };
    }
  }
  open.value = !open.value;
}

function onClickOutside(e: MouseEvent): void {
  if (triggerRef.value && !triggerRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>

<template>
  <div ref="triggerRef" class="inline-block">
    <button
      @click="toggle"
      class="rounded px-1 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
      :class="isAutoClosedBreak || excessMinutes > 0 ? 'text-amber-600 font-medium' : 'text-gray-700'"
      :aria-expanded="open"
      aria-haspopup="true"
    >
      {{ formatMinutes(totalMinutes) }}
      <span v-if="isAutoClosedBreak || excessMinutes > 0" class="ml-0.5 text-xs">⚠</span>
      <span v-else class="ml-0.5 text-gray-400 text-xs">▾</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        role="dialog"
        aria-label="Break details"
        class="fixed z-50 min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg"
        :style="popoverStyle"
      >
        <div class="px-3 py-2 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Break Detail</p>
        </div>

        <div v-if="breaks.length === 0" class="px-3 py-2 text-xs text-gray-400">
          No breaks recorded.
        </div>

        <ul v-else class="divide-y divide-gray-50 py-1">
          <li
            v-for="(b, i) in breaks"
            :key="b.id"
            class="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
            :class="isAutoClosedBreak && i === breaks.length - 1 ? 'bg-red-50' : ''"
          >
            <span class="text-gray-500 shrink-0">Break {{ i + 1 }}</span>
            <span class="font-mono"
              :class="isAutoClosedBreak && i === breaks.length - 1 ? 'text-red-700' : 'text-gray-700'"
            >
              {{ formatTime(b.breakStartAt) }} — {{ b.breakEndAt ? formatTime(b.breakEndAt) : '?' }}
            </span>
            <span class="text-gray-400 shrink-0">
              {{ b.durationMinutes !== null ? formatMinutes(b.durationMinutes) : '—' }}
            </span>
          </li>
        </ul>

        <div v-if="isAutoClosedBreak" class="flex gap-2 px-3 py-2 text-xs text-red-700 bg-red-50 border-t border-red-100">
          <span class="shrink-0">⚠</span>
          <span>Break was not ended — auto-closed at clock-out. Session flagged for review.</span>
        </div>

        <div
          v-if="excessMinutes > 0"
          class="flex gap-2 rounded-b-lg px-3 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100"
        >
          <span class="shrink-0">⚠</span>
          <span>{{ formatMinutes(excessMinutes) }} over the 60m allowance — deducted from paid hours.</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>
