<script setup lang="ts">
import { computed } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        success: 'border-transparent bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        outline: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

type BadgeProps = {
  variant?: 'default' | 'secondary' | 'success' | 'outline'
}
const props = defineProps<BadgeProps>()
const klass = computed(() => cn(badgeVariants({ variant: props.variant })))
</script>

<template>
  <span :class="klass"><slot /></span>
</template>
