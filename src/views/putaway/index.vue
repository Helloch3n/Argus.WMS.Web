<!-- filepath: src/views/putaway/index.vue -->
<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'

import * as PutawayService from '@/api/putaway/putaway'

type AvailableReelRow = PutawayService.AvailableReelDto

type TaskRow = PutawayService.PutawayTaskDto

const message = useMessage()
const dialog = useDialog()

const activeTab = ref<'source' | 'tasks'>('source')

const sourceLoading = ref(false)
const sourceFilter = ref('')
const sourceRows = ref<AvailableReelRow[]>([])

const taskLoading = ref(false)
const taskRows = ref<TaskRow[]>([])
const taskStatus = ref<string | null>(null)
const taskStatusOptions: SelectOption[] = [
  { label: '全部', value: null as unknown as string },
  { label: '待执行', value: 'Pending' },
  { label: '执行中', value: 'InProgress' },
  { label: '已完成', value: 'Completed' },
  { label: '已取消', value: 'Cancelled' },
]

const completeModalVisible = ref(false)
const completeSubmitting = ref(false)
const completeFormRef = ref<FormInst | null>(null)
const completeForm = reactive({
  taskId: '',
  taskNo: '',
  reelNo: '',
  targetLocationCode: '',
})

const completeRules: FormRules = {
  targetLocationCode: [{ required: true, message: '请扫描/输入目标库位', trigger: ['input', 'blur'] }],
}

function getStatus(raw: unknown) {
  if (raw === 0) return 'Pending'
  if (raw === 1) return 'InProgress'
  if (raw === 2) return 'Completed'
  if (raw === 3) return 'Cancelled'
  return typeof raw === 'string' ? raw : 'Pending'
}
function getStatusText(status: string) {
  if (status === 'Pending') return '待执行'
  if (status === 'InProgress') return '执行中'
  if (status === 'Completed') return '已完成'
  if (status === 'Cancelled') return '已取消'
  return status
}
function getStatusType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Pending') return 'warning'
  if (status === 'InProgress') return 'info'
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'default'
  return 'default'
}
function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseDisplayQuantity(v: unknown): { quantity?: number; unit?: string } {
  const text = typeof v === 'string' ? v.trim() : ''
  if (!text) return {}
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*(\S+)?$/)
  if (!m) return {}
  const n = Number(m[1])
  return { quantity: Number.isFinite(n) ? n : undefined, unit: m[2] }
}

async function loadSource() {
  sourceLoading.value = true
  try {
    const res = await PutawayService.getAvailableReels({
      filter: sourceFilter.value.trim() || undefined,
    })
    sourceRows.value = res.items ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载待上架资源失败')
  } finally {
    sourceLoading.value = false
  }
}

async function createTask(row: AvailableReelRow) {
  const reelNo = row.reelNo
  if (!reelNo) {
    message.error('盘号为空，无法生成任务')
    return
  }

  dialog.warning({
    title: '确认',
    content: `确认生成盘号 ${reelNo} 的上架任务吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await PutawayService.create({
          reelNo,
        })
        message.success('任务生成成功')
        await Promise.all([loadSource(), loadTasks()])
      } catch (e) {
        message.error(e instanceof Error ? e.message : '生成任务失败')
      }
    },
  })
}

async function loadTasks() {
  taskLoading.value = true
  try {
    const res = await PutawayService.getList({
      status: taskStatus.value || undefined,
    })
    taskRows.value = res.items ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载任务失败')
  } finally {
    taskLoading.value = false
  }
}

function openCompleteModal(row: TaskRow) {
  completeForm.taskId = row.id ?? ''
  completeForm.taskNo = row.taskNo ?? ''
  completeForm.reelNo = row.reelNo ?? ''
  completeForm.targetLocationCode = ''
  completeModalVisible.value = true
}

async function onConfirmComplete() {
  try {
    await completeFormRef.value?.validate()
  } catch {
    return
  }

  completeSubmitting.value = true
  try {
    const taskId = completeForm.taskId.trim()
    if (!taskId) {
      message.error('缺少任务 ID，无法完成')
      return
    }
    await PutawayService.complete(taskId, {
      targetLocationCode: completeForm.targetLocationCode.trim(),
    })
    message.success('上架完成')
    completeModalVisible.value = false
    await Promise.all([loadTasks(), loadSource()])
  } catch (e) {
    message.error(e instanceof Error ? e.message : '完成上架失败')
  } finally {
    completeSubmitting.value = false
  }
}

function onQuerySource() {
  loadSource()
}
function onRefreshTasks() {
  loadTasks()
}
function onTabChange(name: string) {
  activeTab.value = name as 'source' | 'tasks'
  if (activeTab.value === 'tasks' && taskRows.value.length === 0) {
    loadTasks()
  }
}

const sourceColumns = computed<DataTableColumns<AvailableReelRow>>(() => [
  { title: '盘号', key: 'reelNo', minWidth: 160, render: (row: AvailableReelRow) => row.reelNo || '-' },
  {
    title: '物料名称',
    key: 'displayProductName',
    minWidth: 220,
    render: (row: AvailableReelRow) => row.displayProductName || '-',
  },
  {
    title: '当前位置',
    key: 'locationCode',
    minWidth: 160,
    render: (row: AvailableReelRow) => row.locationCode || '-',
  },
  {
    title: '数量',
    key: 'displayQuantity',
    width: 140,
    render: (row: AvailableReelRow) => {
      const parsed = parseDisplayQuantity(row.displayQuantity)
      return parsed.quantity ?? row.displayQuantity ?? '-'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row: AvailableReelRow) =>
      h(
        NButton,
        { size: 'small', type: 'primary', onClick: () => createTask(row) },
        { default: () => '生成任务' },
      ),
  },
])

const taskColumns = computed<DataTableColumns<TaskRow>>(() => [
  { title: '任务号', key: 'taskNo', minWidth: 180, render: (row: TaskRow) => row.taskNo || '-' },
  { title: '盘号', key: 'reelNo', minWidth: 160, render: (row: TaskRow) => row.reelNo || '-' },
  {
    title: '源库位',
    key: 'fromLocationCode',
    minWidth: 160,
    render: (row: TaskRow) => row.fromLocationCode || '-',
  },
  {
    title: '状态',
    key: 'status',
    width: 130,
    align: 'center',
    render: (row: TaskRow) => {
      const status = getStatus(row.status)
      return h(
        NTag,
        { type: getStatusType(status), size: 'small' },
        { default: () => getStatusText(status) },
      )
    },
  },
  {
    title: '创建时间',
    key: 'creationTime',
    minWidth: 180,
    render: (row: TaskRow) => formatDateTime(row.creationTime),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row: TaskRow) => {
      const status = getStatus(row.status)
      const canComplete = status === 'Pending' || status === 'InProgress'
      if (!canComplete) return h('span', '-')
      return h(
        NButton,
        { size: 'small', type: 'success', onClick: () => openCompleteModal(row) },
        { default: () => '完成上架' },
      )
    },
  },
])

onMounted(async () => {
  await loadSource()
})
</script>

<template>
  <n-card :bordered="false">
    <n-tabs type="line" :value="activeTab" @update:value="onTabChange">
      <n-tab-pane name="source" tab="待上架资源">
        <div class="toolbar">
          <n-space>
            <n-input
              v-model:value="sourceFilter"
              placeholder="扫描盘号或物料"
              clearable
              style="width: 320px"
              @keyup.enter="onQuerySource"
            />
            <n-button type="primary" :loading="sourceLoading" @click="onQuerySource">查询</n-button>
          </n-space>
        </div>

        <n-data-table :loading="sourceLoading" :columns="sourceColumns" :data="sourceRows" :bordered="false" />
      </n-tab-pane>

      <n-tab-pane name="tasks" tab="执行任务">
        <div class="toolbar">
          <n-space>
            <n-button :loading="taskLoading" @click="onRefreshTasks">刷新</n-button>
            <n-select
              v-model:value="taskStatus"
              :options="taskStatusOptions"
              clearable
              placeholder="状态"
              style="width: 180px"
              @update:value="onRefreshTasks"
            />
          </n-space>
        </div>

        <n-data-table :loading="taskLoading" :columns="taskColumns" :data="taskRows" :bordered="false" />
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="completeModalVisible" preset="card" title="完成上架" style="width: 560px">
      <n-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="120">
        <n-form-item label="任务号">
          <n-input :value="completeForm.taskNo" disabled />
        </n-form-item>
        <n-form-item label="盘号">
          <n-input :value="completeForm.reelNo" disabled />
        </n-form-item>
        <n-form-item label="目标库位" path="targetLocationCode">
          <n-input
            v-model:value="completeForm.targetLocationCode"
            placeholder="请扫描货架条码"
            autofocus
            @keyup.enter="onConfirmComplete"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="completeModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="completeSubmitting" @click="onConfirmComplete">确认</n-button>
        </div>
      </template>
    </n-modal>
  </n-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>