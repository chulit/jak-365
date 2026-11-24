<script setup lang="ts">
import { Loader2, RefreshCw, Sheet, RotateCcw } from 'lucide-vue-next'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Badge from './ui/Badge.vue'

export type SheetStatus = 'contoh' | 'memuat' | 'terhubung' | 'error'

const props = defineProps<{
  modelValue: string
  status: SheetStatus
  error: string | null
  connectedId: string | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'load'): void
  (e: 'reset'): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Sheet class="size-4" />
      </span>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Sumber Data: Google Sheet</p>
        <p class="truncate text-xs text-slate-500 dark:text-slate-400">
          <template v-if="props.status === 'terhubung' && props.connectedId">
            Terhubung ke Sheet <span class="font-mono font-medium text-slate-700 dark:text-slate-300">{{ props.connectedId }}</span>
          </template>
          <template v-else-if="props.status === 'memuat'">Memuat data dari Google Sheet…</template>
          <template v-else-if="props.status === 'error'">{{ props.error ?? 'Gagal memuat Sheet.' }}</template>
          <template v-else>
            Memakai data contoh (angka sesuai screenshot). Tempel ID Google Sheet untuk memakai data asli.
          </template>
        </p>
      </div>
      <Badge v-if="props.status === 'terhubung'" variant="success">Terhubung</Badge>
      <Badge v-else-if="props.status === 'error'" variant="outline" class="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300">Gagal</Badge>
      <Badge v-else variant="secondary">Data Contoh</Badge>
    </div>

    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Input
        :model-value="props.modelValue"
        placeholder="ID Google Sheet (dari URL …/d/ID/edit)"
        class="sm:w-72"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <Button :disabled="props.status === 'memuat' || !props.modelValue.trim()" @click="emit('load')">
        <Loader2 v-if="props.status === 'memuat'" class="size-4 animate-spin" />
        <RefreshCw v-else class="size-4" />
        Muat
      </Button>
      <Button v-if="props.status === 'terhubung'" variant="outline" @click="emit('reset')">
        <RotateCcw class="size-4" />
        Data Contoh
      </Button>
    </div>
  </div>
</template>
