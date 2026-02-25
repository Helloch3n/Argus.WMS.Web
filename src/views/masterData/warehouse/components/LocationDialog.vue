<script lang="ts">
export default {
  name: 'LocationDialog',
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
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

import { create as createLocation, update as updateLocation } from '@/api/masterData/location'

type LocationRow = {
  id?: string
  code?: string
  aisle?: string | number
  rack?: string | number
  level?: string | number
  bin?: string | number
  status?: number
  type?: number
  maxWeight?: number
  maxVolume?: number
  zoneId?: string
  warehouseId?: string
  maxReelCount?: number
  allowMixedProducts?: boolean
  allowMixedBatches?: boolean
}

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const currentId = ref<string | null>(null)
const currentZoneId = ref<string>('')
const warehouseLabel = ref('')

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const form = reactive({
  code: '',
  aisle: '',
  rack: '',
  level: '',
  bin: '',
  status: 0,
  type: 20,
  maxWeight: 0 as number,
  maxVolume: 0 as number,
  warehouseId: '' as string,
  maxReelCount: 0 as number,
  allowMixedProducts: false,
  allowMixedBatches: false,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入库位编码', trigger: ['input', 'blur'] }],
  aisle: [{ required: true, message: '请输入巷道', trigger: ['input', 'blur'] }],
  rack: [{ required: true, message: '请输入货架', trigger: ['input', 'blur'] }],
  level: [{ required: true, message: '请输入层', trigger: ['input', 'blur'] }],
  bin: [{ required: true, message: '请输入位', trigger: ['input', 'blur'] }],
  maxReelCount: [{ required: true, type: 'number', message: '请输入最大容器数', trigger: ['input', 'blur'] }],
  maxWeight: [{ required: true, type: 'number', message: '请输入最大重量', trigger: ['input', 'blur'] }],
  maxVolume: [{ required: true, type: 'number', message: '请输入最大体积', trigger: ['input', 'blur'] }],
  status: [{ required: true, type: 'number', message: '请选择状态', trigger: ['change', 'blur'] }],
  type: [{ required: true, type: 'number', message: '请选择库位类型', trigger: ['change', 'blur'] }],
}

function resetForm() {
  form.code = ''
  form.aisle = ''
  form.rack = ''
  form.level = ''
  form.bin = ''
  form.status = 0
  form.type = 20
  form.maxWeight = 0
  form.maxVolume = 0
  form.warehouseId = ''
  form.maxReelCount = 0
  form.allowMixedProducts = false
  form.allowMixedBatches = false
}

interface OpenOptions {
  zoneId: string
  row?: LocationRow
  warehouseId?: string
  warehouseCode?: string
  warehouseName?: string
}

function open(opts: OpenOptions) {
  currentZoneId.value = opts.zoneId
  form.warehouseId = opts.warehouseId ?? ''
  warehouseLabel.value = [opts.warehouseCode, opts.warehouseName].filter(Boolean).join(' ') || opts.warehouseId || ''

  if (opts.row?.id) {
    mode.value = 'edit'
    currentId.value = opts.row.id
    form.code = opts.row.code ?? ''
    form.aisle = String(opts.row.aisle ?? '')
    form.rack = String(opts.row.rack ?? '')
    form.level = String(opts.row.level ?? '')
    form.bin = String(opts.row.bin ?? '')
    form.status = typeof opts.row.status === 'number' ? opts.row.status : 0
    form.type = typeof opts.row.type === 'number' ? opts.row.type : 20
    form.maxWeight = typeof opts.row.maxWeight === 'number' ? opts.row.maxWeight : 0
    form.maxVolume = typeof opts.row.maxVolume === 'number' ? opts.row.maxVolume : 0
    form.warehouseId = opts.row.warehouseId ?? form.warehouseId
    form.maxReelCount = typeof opts.row.maxReelCount === 'number' ? opts.row.maxReelCount : 0
    form.allowMixedProducts = Boolean(opts.row.allowMixedProducts)
    form.allowMixedBatches = Boolean(opts.row.allowMixedBatches)
  } else {
    mode.value = 'create'
    currentId.value = null
    resetForm()
    form.warehouseId = opts.warehouseId ?? ''
    form.type = 20
  }

  visible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()

  const payload = {
    zoneId: currentZoneId.value,
    code: form.code,
    aisle: String(form.aisle),
    rack: String(form.rack),
    level: String(form.level),
    bin: String(form.bin),
    maxWeight: Number(form.maxWeight ?? 0),
    maxVolume: Number(form.maxVolume ?? 0),
    status: form.status,
    type: form.type,
    warehouseId: form.warehouseId,
    maxReelCount: Number(form.maxReelCount ?? 0),
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
    <n-card :title="mode === 'create' ? '新增库位' : '编辑库位'" style="width: 720px" closable @close="visible = false">
      <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
        <n-form-item label="库位编码" path="code">
          <n-input v-model:value="form.code" />
        </n-form-item>

        <n-form-item label="巷道" path="aisle">
          <n-input v-model:value="form.aisle" />
        </n-form-item>
        <n-form-item label="货架" path="rack">
          <n-input v-model:value="form.rack" />
        </n-form-item>
        <n-form-item label="层" path="level">
          <n-input v-model:value="form.level" />
        </n-form-item>
        <n-form-item label="位" path="bin">
          <n-input v-model:value="form.bin" />
        </n-form-item>

        <n-form-item label="最大容器数" path="maxReelCount">
          <n-input-number v-model:value="form.maxReelCount" :min="0" />
        </n-form-item>

        <n-form-item label="所属仓库">
          <n-input :value="warehouseLabel" readonly />
        </n-form-item>

        <n-form-item label="状态">
          <n-select
            v-model:value="form.status"
            placeholder="请选择状态"
            :options="[
              { value: 0, label: '空闲' },
              { value: 10, label: '部分占用' },
              { value: 20, label: '已满' },
              { value: 30, label: '锁定' },
            ]"
          />
        </n-form-item>

        <n-form-item label="库位类型" path="type">
          <n-select
            v-model:value="form.type"
            placeholder="请选择库位类型"
            :options="[
              { value: 10, label: '收货暂存区' },
              { value: 20, label: '正式存储区' },
              { value: 30, label: '生产线边库' },
              { value: 40, label: '质检/隔离区' },
              { value: 50, label: '发货暂存区' },
            ]"
          />
        </n-form-item>

        <n-form-item label="允许混放产品">
          <n-switch v-model:value="form.allowMixedProducts" />
        </n-form-item>

        <n-form-item label="允许混放批次">
          <n-switch v-model:value="form.allowMixedBatches" />
        </n-form-item>

        <n-form-item label="最大重量">
          <n-input-number v-model:value="form.maxWeight" :min="0" :step="1" />
        </n-form-item>
        <n-form-item label="最大体积">
          <n-input-number v-model:value="form.maxVolume" :min="0" :step="0.1" />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" @click="onSubmit">保存</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>