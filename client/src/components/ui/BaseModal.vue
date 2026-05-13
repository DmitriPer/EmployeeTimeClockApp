<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import type { ModalSize } from './types.js';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}>(), {
  size: 'md',
  closeOnBackdrop: true,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'close'): void;
}>();

const sizeClass = computed(() => ({
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
}[props.size]));

function close(): void {
  emit('update:open', false);
  emit('close');
}

function onBackdrop(e: MouseEvent): void {
  if (!props.closeOnBackdrop) return;
  if (e.target === e.currentTarget) close();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.open) close();
}

watch(() => props.open, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
}, { immediate: true });

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click="onBackdrop"
      >
        <div
          class="w-full bg-white shadow-xl rounded-t-lg sm:rounded-lg flex flex-col max-h-[90vh]"
          :class="sizeClass"
          @click.stop
        >
          <header class="border-b border-gray-200 px-4 py-3 sm:px-5 flex items-start justify-between">
            <div>
              <h2 class="text-sm font-semibold text-gray-900">{{ title }}</h2>
              <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="ml-4 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Close"
              @click="close"
            >&times;</button>
          </header>
          <div class="overflow-y-auto flex-1 px-4 py-4 sm:px-5">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="border-t border-gray-200 px-4 py-3 sm:px-5 flex justify-end gap-2"
          >
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 150ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
