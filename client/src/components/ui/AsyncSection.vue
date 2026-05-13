<script setup lang="ts">
withDefaults(defineProps<{
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  loadingText?: string;
}>(), {
  empty: false,
  emptyText: 'No results.',
  loadingText: 'Loading…',
});
</script>

<template>
  <div>
    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>
    <div v-else-if="loading" class="text-sm text-gray-400">
      {{ loadingText }}
    </div>
    <div v-else-if="empty" class="text-sm text-gray-400">
      {{ emptyText }}
    </div>
    <slot v-else />
  </div>
</template>
