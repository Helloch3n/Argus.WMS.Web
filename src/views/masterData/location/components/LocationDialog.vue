<script lang="ts">
export default { name: 'LocationDialog' }

export type LocationDialogExpose = {
  open: (params: { mode: 'create' | 'edit'; zoneId: string; warehouseId: string; row?: import('@/api/masterData/location').LocationDto }) => void
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { create as createLocation, update as updateLocation, type LocationDto } from '@/api/masterData/location'

const emit = defineEmits<{ success: [] }>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const currentId = ref<string | null>(null)
const currentZoneId = ref('')
const currentWarehouseId = ref('')

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const form = reactive({
  code: '',
  aisle: '',
  rack: '',
  level: '',
  bin: '',
  type: 20 as number,
  maxWeight: 0,
  maxVolume: 0,
  maxReelCount: 1,
  allowMixedProducts: true,
  allowMixedBatches: true,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入库位编码', trigger: ['input', 'blur'] }],
  aisle: [{ required: true, message: '请输入巷道', trigger: ['input', 'blur'] }],
  rack: [{ required: true, message: '请输入货架', trigger: ['input', 'blur'] }],
  level: [{ required: true, message: '请输入层', trigger: ['input', 'blur'] }],
}

const typeOptions = [
  { value: 10, label: '收货暂存区' },
  { value: 20, label: '正式存储区' },
  { value: 30, label: '线边库' },
  { value: 40, label: '质检/隔离区' },
  { value: 50, label: '发货暂存区' },
]

function resetForm() {
  form.code = ''
  form.aisle = ''
  form.rack = ''
  form.level = ''
  form.bin = ''
  form.type = 20
  form.maxWeight = 0
  form.maxVolume = 0
  form.maxReelCount = 1
  form.allowMixedProducts = true
  form.allowMixedBatches = true
}

type OpenParams = {
  mode: 'create' | 'edit'
  zoneId: string
  warehouseId: string
  row?: LocationDto
}

function open(params: OpenParams) {
  mode.value = params.mode
  currentZoneId.value = params.zoneId
  currentWarehouseId.value = params.warehouseId

  if (params.mode === 'edit' && params.row) {
    currentId.value = params.row.id ?? null
    form.code = params.row.code
    form.aisle = params.row.aisle
    form.rack = params.row.rack
    form.level = params.row.level
    form.bin = params.row.bin
    form.type = params.row.type
    form.maxWeight = params.row.maxWeight
    form.maxVolume = params.row.maxVolume
    form.maxReelCount = params.row.maxReelCount
    form.allowMixedProducts = params.row.allowMixedProducts
    form.allowMixedBatches = params.row.allowMixedBatches
  } else {
    currentId.value = null
    resetForm()
  }
  visible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()

  const payload = {
    zoneId: currentZoneId.value,
    warehouseId: currentWarehouseId.value,
    code: form.code,
    aisle: form.aisle,
    rack: form.rack,
    level: form.level,
    bin: form.bin,
    type: form.type,
    maxWeight: form.maxWeight,
    maxVolume: form.maxVolume,
    maxReelCount: form.maxReelCount,
    allowMixedProducts: form.allowMixedProducts,
    allowMixedBatches: form.allowMixedBatches,
  }

  if (mode.value === 'edit' && currentId.value) {
    await updateLocation(currentId.value, payload)
    message.success('更新成功')
  } else {
    await createLocation(payload)
    message.success('创建成功')
  }

  visible.value = false
  emit('success')
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="visible">
    <n-card
      :title="mode === 'create' ? '新建库位' : '编辑库位'"
      style="width: 640px"
      closable
      @close="visible = false"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="100">
        <n-form-item label="库位编码" path="code">
          <n-input v-model:value="form.code" placeholder="如: A-01-01" />
        </n-form-item>
        <n-form-item label="巷道" path="aisle">
          <n-input v-model:value="form.aisle" placeholder="如: A" />
        </n-form-item>
        <n-form-item label="货架" path="rack">
          <n-input v-model:value="form.rack" placeholder="如: 01" />
        </n-form-item>
        <n-form-item label="层" path="level">
          <n-input v-model:value="form.level" placeholder="如: 01" />
        </n-form-item>
        <n-form-item label="位">
          <n-input v-model:value="form.bin" placeholder="如: 01 (可选)" />
        </n-form-item>
        <n-form-item label="库位类型">
          <n-select v-model:value="form.type" :options="typeOptions" />
        </n-form-item>
        <n-form-item label="最大承重 (kg)">
          <n-input-number v-model:value="form.maxWeight" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="最大体积 (m³)">
          <n-input-number v-model:value="form.maxVolume" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="最大容器数">
          <n-input-number v-model:value="form.maxReelCount" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="允许混放物料">
          <n-switch v-model:value="form.allowMixedProducts" />
        </n-form-item>
        <n-form-item label="允许混放批次">
          <n-switch v-model:value="form.allowMixedBatches" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="end">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" @click="onSubmit">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
