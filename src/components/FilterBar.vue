<script setup lang="ts">
import { computed } from 'vue'
import { ALL, PERIODE_OPTIONS, periodeById, periodeId, type Filters } from '@/lib/compute'
import Select, { type SelectOption } from './ui/Select.vue'

const props = defineProps<{
  modelValue: Filters
  mitraOptions: string[]
  kategoriOptions: string[]
  wilayahOptions: string[]
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Filters): void }>()

const withAll = (label: string, values: string[]): SelectOption[] => [
  { value: ALL, label },
  ...values.map((v) => ({ value: v, label: v })),
]
const periode = computed<SelectOption[]>(() => PERIODE_OPTIONS)
const mitra = computed(() => withAll('Semua Mitra', props.mitraOptions))
const kategori = computed(() => withAll('Semua Kategori', props.kategoriOptions))
const wilayah = computed(() => withAll('Semua Wilayah', props.wilayahOptions))

function set<K extends keyof Filters>(key: K, value: Filters[K]): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

/** ID periode terpilih ("2026-10_2026-11") dari jendela start–end. */
const periodId = computed(() => periodeId(props.modelValue.startMonth, props.modelValue.endMonth))

function setPeriode(value: string): void {
  const opt = periodeById(value)
  emit('update:modelValue', { ...props.modelValue, startMonth: opt.start, endMonth: opt.end })
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Periode</label>
      <Select
        :model-value="periodId"
        :options="periode"
        aria-label="Periode"
        @update:model-value="setPeriode"
      />
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Mitra Pemasaran</label>
      <Select
        :model-value="modelValue.mitra"
        :options="mitra"
        aria-label="Mitra Pemasaran"
        @update:model-value="set('mitra', $event)"
      />
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Kategori Produk</label>
      <Select
        :model-value="modelValue.kategori"
        :options="kategori"
        aria-label="Kategori Produk"
        @update:model-value="set('kategori', $event)"
      />
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Wilayah</label>
      <Select
        :model-value="modelValue.wilayah"
        :options="wilayah"
        aria-label="Wilayah"
        @update:model-value="set('wilayah', $event)"
      />
    </div>
  </div>
</template>
