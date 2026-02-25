<script lang="ts">
export default {
  name: 'PickTaskView',
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
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import * as pickTaskApi from '@/api/wms/pickTask'
import type { PickTaskDto } from '@/api/wms/pickTask'
import { withResizable } from '@/utils/table'

type TaskRow = PickTaskDto

const message = useMessage()
const loading = ref(false)
const rows = ref<TaskRow[]>([])
const completingIds = ref<Set<string>>(new Set())

const query = reactive({
  reelNo: '',
  status: 'Pending' as string | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusOptions: SelectOption[] = [
  { label: '全部', value: null as unknown as string },
  { label: '待处理', value: 'Pending' },
  { label: '执行中', value: 'InProgress' },
  { label: '已完成', value: 'Completed' },
  { label: '已取消', value: 'Cancelled' },
]

const listParams = computed<pickTaskApi.GetPickTaskListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  reelNo: query.reelNo.trim() || undefined,
  status: query.status ?? undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await pickTaskApi.getList(listParams.value)
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

function onReset() {
  query.reelNo = ''
  query.status = 'Pending'
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

async function handleComplete(row: TaskRow) {
  const id = row.id
  completingIds.value = new Set([...completingIds.value, id])
  try {
    await pickTaskApi.complete(id)
    message.success(`盘号 ${row.reelNo} 拣货完成`)
    await loadData()
  } catch {
    // 全局拦截器已弹出 ABP 业务错误，此处无需重复提示
  } finally {
    const next = new Set(completingIds.value)
    next.delete(id)
    completingIds.value = next
  }
}

function resolveStatus(raw: string | number): string {
  if (raw === 'Pending' || raw === 0) return 'Pending'
  if (raw === 'InProgress' || raw === 1) return 'InProgress'
  if (raw === 'Completed' || raw === 2) return 'Completed'
  if (raw === 'Cancelled' || raw === 3) return 'Cancelled'
  return String(raw)
}

function getStatusLabel(status: string): string {
  if (status === 'Pending') return '待处理'
  if (status === 'InProgress') return '执行中'
  if (status === 'Completed') return '已完成'
  if (status === 'Cancelled') return '已取消'
  return status
}

function getStatusTagType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Pending') return 'warning'
  if (status === 'InProgress') return 'info'
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'default'
  return 'default'
}

function formatDateTime(v?: string): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const columns = computed<DataTableColumns<TaskRow>>(() =>
  withResizable([
    {
      title: '盘号',
      key: 'reelNo',
      minWidth: 160,
      render: (row) => row.reelNo || '-',
    },
    {
      title: '源库位',
      key: 'fromLocationCode',
      minWidth: 160,
      render: (row) => row.fromLocationCode || '-',
    },
    {
      title: '产品编码',
      key: 'productCode',
      minWidth: 160,
      render: (row) => row.productCode || '-',
    },
    {
      title: '批次号',
      key: 'batchNo',
      minWidth: 160,
      render: (row) => row.batchNo || '-',
    },
    {
      title: '唯一码/SN',
      key: 'sn',
      minWidth: 180,
      render: (row) =>
        row.sn
          ? h(NTag, { type: 'primary', size: 'small' }, { default: () => row.sn })
          : '-',
    },
    {
      title: '目标长度',
      key: 'targetLength',
      minWidth: 140,
      align: 'right',
      render: (row) => `${row.targetLength ?? 0} 米`,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      align: 'center',
      render: (row) => {
        const status = resolveStatus(row.status)
        return h(
          NTag,
          { type: getStatusTagType(status), size: 'small' },
          { default: () => getStatusLabel(status) },
        )
      },
    },
    {
      title: '创建时间',
      key: 'creationTime',
      minWidth: 185,
      render: (row) => formatDateTime(row.creationTime),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (row) => {
        const status = resolveStatus(row.status)
        const canComplete = status === 'Pending' || status === 'InProgress'
        if (!canComplete) return h('span', { style: 'color: #ccc' }, '-')

        return h(
          NPopconfirm,
          { onPositiveClick: () => handleComplete(row) },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  type: 'primary',
                  loading: completingIds.value.has(row.id),
                },
                { default: () => '完成拣货' },
              ),
            default: () => `确认盘号 ${row.reelNo} 已完成分切/拣货？`,
          },
        )
      },
    },
  ]),
)

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <n-card class="search-card" :bordered="false">
      <n-form inline label-width="80">
        <n-form-item label="盘号">
          <n-input
            v-model:value="query.reelNo"
            placeholder="请输入盘号"
            clearable
            style="width: 220px"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="query.status"
            :options="statusOptions"
            clearable
            placeholder="请选择状态"
            style="width: 160px"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
            <n-button @click="onReset">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>

    <n-card :bordered="false">
      <n-data-table :loading="loading" :columns="columns" :data="rows" :bordered="false" />
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
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>