<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  /** 0–100 */
  value: number
  class?: string
  barClass?: string
}>()
const pct = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="Math.round(pct)"
    aria-valuemin="0"
    aria-valuemax="100"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', props.class)"
  >
    <div
      class="h-full rounded-full bg-primary transition-all duration-500"
      :class="props.barClass"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>
