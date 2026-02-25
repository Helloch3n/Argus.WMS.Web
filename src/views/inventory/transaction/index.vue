<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import {
  getInventoryTransactions,
  type InventoryTransactionDto,
  type InventoryTransactionSearchDto,
} from '@/api/inventory/transaction'
import { withResizable } from '@/utils/table'

type TransactionRow = InventoryTransactionDto & { id?: string }
type QueryParams = InventoryTransactionSearchDto & { dateRange?: [number, number] | null }

const message = useMessage()
const loading = ref(false)
const rows = ref<TransactionRow[]>([])

const query = reactive<QueryParams>({
  billNo: '',
  reelNo: '',
  type: undefined as string | number | undefined,
  dateRange: null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
})

const typeOptions: SelectOption[] = [
  { label: '入库', value: 'In' },
  { label: '出库', value: 'Out' },
  { label: '移库', value: 'Move' },
  { label: '盘点', value: 'Check' },
]

function toIso(v?: number | null) {
  if (!v) return undefined
  return new Date(v).toISOString()
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function resolveType(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'In') return '入库'
    if (raw === 'Out') return '出库'
    if (raw === 'Move') return '移库'
    if (raw === 'Check') return '盘点'
    return raw
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '入库'
    if (raw === 1) return '出库'
    if (raw === 2) return '移库'
    if (raw === 3) return '盘点'
  }
  return '-'
}

function getTypeTagType(label: string) {
  if (label === '入库') return 'success'
  if (label === '出库') return 'error'
  if (label === '移库') return 'info'
  if (label === '盘点') return 'warning'
  return 'default'
}

const listParams = computed<InventoryTransactionSearchDto>(() => ({
  maxResultCount: pagination.pageSize as number,
  skipCount: ((pagination.page as number) - 1) * (pagination.pageSize as number),
  billNo: query.billNo || undefined,
  reelNo: query.reelNo || undefined,
  type: query.type ?? undefined,
  startTime: toIso(query.dateRange?.[0]),
  endTime: toIso(query.dateRange?.[1]),
}))

async function loadData() {
  loading.value = true
  try {
    const data = await getInventoryTransactions(listParams.value)
    rows.value = data.items ?? []
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  pagination.page = 1
  loadData()
}

function onReset() {
  query.billNo = ''
  query.reelNo = ''
  query.type = undefined
  query.dateRange = null
  pagination.page = 1
  loadData()
}

function handlePageChange(page: number) {
  pagination.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const columns = computed<DataTableColumns<TransactionRow>>(() => withResizable([
  { title: '时间', key: 'creationTime', minWidth: 185, render: (row) => formatDateTime(row.creationTime) },
  {
    title: '事务类型',
    key: 'type',
    width: 120,
    align: 'center',
    render: (row) => {
      const label = resolveType(row.type)
      return h(NTag, { type: getTypeTagType(label), size: 'small' }, { default: () => label })
    },
  },
  { title: '单据号', key: 'billNo', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '产品', key: 'productName', minWidth: 200, ellipsis: { tooltip: true } },
  { title: '托盘', key: 'reelNo', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '来源仓库', key: 'fromWarehouseCode', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '目标仓库', key: 'toWarehouseCode', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '来源库位', key: 'fromLocationCode', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '目标库位', key: 'toLocationCode', minWidth: 140, ellipsis: { tooltip: true } },
  {
    title: '变动数量',
    key: 'quantity',
    width: 140,
    align: 'right',
    render: (row) => {
      const val = row.quantity
      if (typeof val !== 'number' || Number.isNaN(val)) return '-'
      const sign = val > 0 ? '+' : ''
      const color = val >= 0 ? '#22c55e' : '#ef4444'
      return h('span', { style: { color, fontWeight: '600' } }, `${sign}${val}`)
    },
  },
  { title: '结存', key: 'quantityAfter', width: 120, align: 'right' },
  { title: '批次', key: 'batchNo', minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'SN', key: 'sn', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '工艺版本', key: 'craftVersion', minWidth: 120, ellipsis: { tooltip: true } },
  { title: '状态', key: 'status', width: 100, align: 'center' },
  { title: '备注', key: 'remark', minWidth: 200, ellipsis: { tooltip: true } },
]))

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <n-card :bordered="false">
      <n-form inline label-width="80">
        <n-form-item label="单据号">
          <n-input v-model:value="query.billNo" placeholder="单据号" clearable />
        </n-form-item>
        <n-form-item label="托盘号">
          <n-input v-model:value="query.reelNo" placeholder="托盘号" clearable />
        </n-form-item>
        <n-form-item label="事务类型">
          <n-select
            v-model:value="query.type"
            :options="typeOptions"
            placeholder="请选择"
            clearable
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item label="时间范围">
          <n-date-picker v-model:value="query.dateRange" type="daterange" clearable style="width: 280px" />
        </n-form-item>
        <n-form-item>
          <n-space :size="8">
            <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
            <n-button @click="onReset">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>

    <n-card :bordered="false">
      <n-data-table
        :loading="loading"
        :columns="columns"
        :data="rows"
        :bordered="false"
        :remote="true"
        :pagination="pagination"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>