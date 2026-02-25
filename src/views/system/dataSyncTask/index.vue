<script lang="ts">
export default {
  name: 'DataSyncTaskList',
}
</script>

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
  NPagination,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import * as api from '@/api/wms/dataSyncTask'
import type { DataSyncTaskDto, CreateUpdateDataSyncTaskDto } from '@/api/wms/dataSyncTask'

type TaskRow = DataSyncTaskDto

const message = useMessage()
const loading = ref(false)
const rows = ref<TaskRow[]>([])
const togglingIds = ref<Set<string>>(new Set())
const triggeringIds = ref<Set<string>>(new Set())

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  filter: query.filter || undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await api.getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadData()
}

function onRefresh() {
  query.filter = ''
  query.page = 1
  loadData()
}

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadData()
}

// ---- 启停切换 ----
async function handleToggle(row: TaskRow, newVal: boolean) {
  togglingIds.value = new Set([...togglingIds.value, row.id])
  try {
    await api.toggleEnable(row.id, newVal)
    message.success(newVal ? '已启用' : '已停用')
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '切换失败')
  } finally {
    const next = new Set(togglingIds.value)
    next.delete(row.id)
    togglingIds.value = next
  }
}

// ---- 立即触发 ----
async function handleTrigger(row: TaskRow) {
  triggeringIds.value = new Set([...triggeringIds.value, row.id])
  try {
    await api.trigger(row.id)
    message.success('已加入执行队列')
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '触发失败')
  } finally {
    const next = new Set(triggeringIds.value)
    next.delete(row.id)
    triggeringIds.value = next
  }
}

// ---- 状态映射 ----
function resolveSyncStatus(raw?: number | string): string {
  if (raw === 0 || raw === 'Idle') return 'Idle'
  if (raw === 1 || raw === 'Running') return 'Running'
  if (raw === 2 || raw === 'Success') return 'Success'
  if (raw === 3 || raw === 'Failed') return 'Failed'
  return 'Idle'
}

function getSyncStatusLabel(s: string) {
  if (s === 'Running') return '执行中'
  if (s === 'Success') return '成功'
  if (s === 'Failed') return '失败'
  return '空闲'
}

function getSyncStatusTagType(s: string): 'default' | 'info' | 'success' | 'error' {
  if (s === 'Running') return 'info'
  if (s === 'Success') return 'success'
  if (s === 'Failed') return 'error'
  return 'default'
}

function formatDateTime(v?: string | null) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ---- 列定义 ----
const columns = computed<DataTableColumns<TaskRow>>(() => [
  {
    title: '任务名称',
    key: 'taskName',
    minWidth: 220,
    render: (row) =>
      h('div', [
        h('span', row.taskName),
        h('span', { style: 'color: #999; font-size: 12px; margin-left: 6px' }, `(${row.taskCode})`),
      ]),
  },
  {
    title: '执行频率',
    key: 'cronExpression',
    width: 160,
    render: (row) =>
      h('code', { style: 'font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px' }, row.cronExpression),
  },
  {
    title: '启停',
    key: 'isEnabled',
    width: 100,
    align: 'center',
    render: (row) =>
      h(NPopconfirm, {
        onPositiveClick: () => handleToggle(row, !row.isEnabled),
      }, {
        trigger: () =>
          h(NSwitch, {
            value: row.isEnabled,
            loading: togglingIds.value.has(row.id),
            rubberBand: false,
          }),
        default: () => row.isEnabled ? '确认停用该任务？' : '确认启用该任务？',
      }),
  },
  {
    title: '上次执行时间',
    key: 'lastSyncTime',
    width: 185,
    render: (row) => formatDateTime(row.lastSyncTime),
  },
  {
    title: '上次状态',
    key: 'lastSyncStatus',
    width: 110,
    align: 'center',
    render: (row) => {
      const s = resolveSyncStatus(row.lastSyncStatus)
      return h(NTag, { type: getSyncStatusTagType(s), size: 'small' }, { default: () => getSyncStatusLabel(s) })
    },
  },
  {
    title: '日志/信息',
    key: 'lastSyncMessage',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.lastSyncMessage ?? '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    align: 'center',
    render: (row) =>
      h(NSpace, { size: 6, justify: 'center' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              quaternary: true,
              loading: triggeringIds.value.has(row.id),
              onClick: () => handleTrigger(row),
            },
            { default: () => '立即触发' },
          ),
          h(
            NButton,
            { size: 'small', type: 'primary', quaternary: true, onClick: () => openEdit(row) },
            { default: () => '编辑' },
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: async () => {
                await api.remove(row.id)
                message.success('删除成功')
                await loadData()
              },
            },
            {
              trigger: () =>
                h(NButton, { size: 'small', type: 'error', quaternary: true }, { default: () => '删除' }),
              default: () => '确定删除该同步任务吗？',
            },
          ),
        ],
      }),
  },
])

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)

const form = reactive<CreateUpdateDataSyncTaskDto>({
  taskCode: '',
  taskName: '',
  cronExpression: '',
  isEnabled: true,
})

const rules: FormRules = {
  taskCode: [{ required: true, message: '请输入任务编码', trigger: ['input', 'blur'] }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: ['input', 'blur'] }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: ['input', 'blur'] }],
}

function openCreate() {
  dialogMode.value = 'create'
  editingId.value = null
  Object.assign(form, { taskCode: '', taskName: '', cronExpression: '', isEnabled: true })
  dialogVisible.value = true
}

function openEdit(row: TaskRow) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  Object.assign(form, {
    taskCode: row.taskCode,
    taskName: row.taskName,
    cronExpression: row.cronExpression,
    isEnabled: row.isEnabled,
  })
  dialogVisible.value = true
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'edit' && editingId.value) {
      await api.update(editingId.value, { ...form })
      message.success('更新成功')
    } else {
      await api.create({ ...form })
      message.success('创建成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <n-card :bordered="false">
      <div class="toolbar">
        <n-button type="primary" @click="openCreate">+ 新增同步任务</n-button>
        <n-space :size="8" align="center">
          <n-input
            v-model:value="query.filter"
            placeholder="搜索任务名称"
            clearable
            style="width: 220px"
            @keyup.enter="onQuery"
          />
          <n-button :loading="loading" @click="onRefresh">刷新</n-button>
        </n-space>
      </div>

      <n-data-table
        :loading="loading"
        :columns="columns"
        :data="rows"
        :bordered="false"
        size="small"
        striped
      />

      <div class="pager">
        <n-pagination
          v-model:page="query.page"
          v-model:page-size="query.pageSize"
          :item-count="query.total"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-card>

    <!-- 新增 / 编辑弹窗 -->
    <n-modal v-model:show="dialogVisible">
      <n-card
        :title="dialogMode === 'create' ? '新增同步任务' : '编辑同步任务'"
        style="width: 560px"
        closable
        @close="dialogVisible = false"
      >
        <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
          <n-form-item label="任务编码" path="taskCode">
            <n-input v-model:value="form.taskCode" :disabled="dialogMode === 'edit'" placeholder="全局唯一编码" />
          </n-form-item>
          <n-form-item label="任务名称" path="taskName">
            <n-input v-model:value="form.taskName" placeholder="例如：同步ERP物料" />
          </n-form-item>
          <n-form-item label="Cron 表达式" path="cronExpression">
            <div style="width: 100%">
              <n-input v-model:value="form.cronExpression" placeholder="0 0 * * * ?" />
              <span style="color: #999; font-size: 12px">例如: 0 0 * * * ? 代表每小时执行一次</span>
            </div>
          </n-form-item>
          <n-form-item label="启用">
            <n-switch v-model:value="form.isEnabled" />
          </n-form-item>
        </n-form>

        <template #footer>
          <div class="modal-actions">
            <n-button @click="dialogVisible = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="onSubmit">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>