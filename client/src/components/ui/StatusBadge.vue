<script setup lang="ts">
import { computed } from 'vue';
import type { StatusVariant, StatusTone, StatusBadgeSize } from './types.js';

const props = withDefaults(defineProps<{
  variant: StatusVariant;
  label?: string;
  tone?: StatusTone;
  size?: StatusBadgeSize;
}>(), { size: 'sm' });

const SIZE_CLASS: Record<StatusBadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-4 py-1 text-sm font-medium',
};

interface VariantConfig {
  label: string;
  tone: StatusTone;
}

const VARIANTS: Record<Exclude<StatusVariant, 'custom'>, VariantConfig> = {
  pending:          { label: 'Pending',      tone: 'yellow' },
  approved:         { label: 'Approved',     tone: 'green'  },
  rejected:         { label: 'Rejected',     tone: 'red'    },
  flagged:          { label: 'Flagged',      tone: 'amber'  },
  corrected:        { label: 'Corrected',    tone: 'blue'   },
  retroactive:      { label: 'Retroactive',  tone: 'purple' },
  'break-fixed':    { label: 'Break fixed',  tone: 'teal'   },
  active:           { label: 'Active',       tone: 'green'  },
  inactive:         { label: 'Inactive',     tone: 'gray'   },
  'role-employee':  { label: 'EMPLOYEE',     tone: 'gray'   },
  'role-manager':   { label: 'MANAGER',      tone: 'blue'   },
  'role-admin':     { label: 'ADMIN',        tone: 'purple' },
};

const TONE_CLASSES: Record<StatusTone, string> = {
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-700',
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  teal:   'bg-teal-100 text-teal-700',
  gray:   'bg-gray-100 text-gray-600',
};

const resolved = computed<VariantConfig>(() => {
  if (props.variant === 'custom') {
    return { label: props.label ?? '', tone: props.tone ?? 'gray' };
  }
  const base = VARIANTS[props.variant];
  return { label: props.label ?? base.label, tone: props.tone ?? base.tone };
});
</script>

<template>
  <span
    class="inline-block rounded-full"
    :class="[TONE_CLASSES[resolved.tone], SIZE_CLASS[size]]"
  >{{ resolved.label }}</span>
</template>
