<script lang="ts">
export default {
  name: 'ReelModal',
}
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules, SelectOption } from 'naive-ui'

import { create, update, type CreateUpdateReelDto } from '@/api/masterData/reel'
import { getList, type GetLocationListParams } from '@/api/masterData/location'

type ReelRow = {
  id?: string
  reelNo?: string
  name?: string
  type?: number
  selfWeight?: number
  maxWeight?: number
  currentLocationId?: string
}

type ReelFormModel = {
  reelNo: string
  name: string
  type: number | null
  selfWeight: number | null
  maxWeight: number | null
  currentLocationId: string | null
}

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const loading = ref(false)
const message = useMessage()
const formRef = ref<FormInst | null>(null)

const form = reactive<ReelFormModel>({
  reelNo: '',
  name: '',
  type: 0,
  selfWeight: null,
  maxWeight: null,
  currentLocationId: null,
})

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
  type: [{ required: true, type: 'number', message: '请选择类型', trigger: ['change', 'blur'] }],
  selfWeight: [{ required: true, type: 'number', message: '请输入皮重', trigger: ['input', 'blur'] }],
  currentLocationId: [
    {
      trigger: ['change', 'blur'],
      validator: (_rule, value) => {
        if (mode.value === 'create' && !value) {
          return new Error('请选择初始位置')
        }
        return true
      },
    },
  ],
}))

const typeOptions: SelectOption[] = [
  { label: '铁', value: 0 },
  { label: '木', value: 1 },
  { label: '塑料', value: 2 },
]

const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)

async function resetForm() {
  form.reelNo = ''
  form.name = ''
  form.type = 0
  form.selfWeight = null
  form.maxWeight = null
  form.currentLocationId = null
  locationOptions.value = []
}

async function loadLocationOptions(keyword?: string) {
  locationLoading.value = true
  try {
    const params: GetLocationListParams = {
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    }
    const data = await getList(params)
    const items = data.items ?? []
    locationOptions.value = items.map((item) => ({
      label: item.code,
      value: item.id ?? item.code,
    }))
  } finally {
    locationLoading.value = false
  }
}

function open(row?: ReelRow) {
  if (row?.id) {
    mode.value = 'edit'
    editingId.value = row.id
    form.reelNo = row.reelNo ?? ''
    form.name = row.name ?? ''
    form.type = typeof row.type === 'number' ? row.type : null
    form.selfWeight = typeof row.selfWeight === 'number' ? row.selfWeight : null
    form.maxWeight = typeof row.maxWeight === 'number' ? row.maxWeight : null
    form.currentLocationId = row.currentLocationId ?? null
  } else {
    mode.value = 'create'
    editingId.value = null
    resetForm()
    loadLocationOptions()
  }
  visible.value = true
}

function handleLocationSearch(keyword: string) {
  loadLocationOptions(keyword)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const payload: CreateUpdateReelDto = {
      reelNo: form.reelNo || undefined,
      name: form.name,
      type: form.type ?? 0,
      selfWeight: form.selfWeight ?? 0,
      maxWeight: form.maxWeight ?? undefined,
      currentLocationId: form.currentLocationId ?? undefined,
    }

    if (mode.value === 'edit') {
      if (!editingId.value) {
        message.error('缺少 id，无法编辑')
        return
      }
      await update(editingId.value, payload)
      message.success('更新成功')
    } else {
      await create(payload)
      message.success('创建成功')
    }

    visible.value = false
    emit('success')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })

const title = computed(() => (mode.value === 'create' ? '新建线盘' : '编辑线盘'))
const showLocation = computed(() => mode.value === 'create')
</script>

<template>
  <n-modal v-model:show="visible" preset="card" :title="title" style="width: 720px">
    <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
      <n-form-item label="盘号" path="reelNo">
        <n-input
          v-model:value="form.reelNo"
          placeholder="留空自动生成"
        />
      </n-form-item>

      <n-form-item label="名称" path="name">
        <n-input v-model:value="form.name" />
      </n-form-item>

      <n-form-item label="类型" path="type">
        <n-select v-model:value="form.type" :options="typeOptions" placeholder="请选择类型" />
      </n-form-item>

      <n-form-item label="皮重(kg)" path="selfWeight">
        <n-input-number v-model:value="form.selfWeight" :min="0" />
      </n-form-item>

      <n-form-item label="最大承重(kg)">
        <n-input-number v-model:value="form.maxWeight" :min="0" />
      </n-form-item>

      <n-form-item v-if="showLocation" label="初始位置">
        <n-select
          v-model:value="form.currentLocationId"
          filterable
          remote
          :loading="locationLoading"
          placeholder="搜索库位"
          :options="locationOptions"
          @search="handleLocationSearch"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-actions">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>