<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import { withResizable } from '@/utils/table'
import * as receiptApi from '@/api/inbound/receipt'
import CreateReceiptModal from '@/views/inbound/receipt/components/CreateReceiptModal.vue'

type ReceiptRow = receiptApi.Receipt & {
  id?: string
  billNo?: string
  sourceBillNo?: string
  type?: string | number
  status?: string | number
  creationTime?: string
  createdTime?: string
}

type ReceiptQueryParams = receiptApi.GetReceiptListParams & {
  sourceBillNo?: string
}

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const rows = ref<ReceiptRow[]>([])
const createVisible = ref(false)

const query = reactive({
  billNo: '',
  sourceBillNo: '',
  status: null as string | number | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusOptions: SelectOption[] = [
  { label: '草稿', value: 0 },
  { label: '收货中', value: 1 },
  { label: '已完成', value: 2 },
]

const listParams = computed<ReceiptQueryParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  billNo: query.billNo || undefined,
  sourceBillNo: query.sourceBillNo || undefined,
  status: query.status ?? undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await receiptApi.getList(listParams.value)
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

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadData()
}

function resolveStatus(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'Draft') return '草稿'
    if (raw === 'Receiving') return '收货中'
    if (raw === 'Completed') return '已完成'
    return raw
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '草稿'
    if (raw === 1) return '收货中'
    if (raw === 2) return '已完成'
  }
  return '草稿'
}

function getStatusTagType(status: string) {
  if (status === '草稿') return 'info'
  if (status === '收货中') return 'warning'
  if (status === '已完成') return 'success'
  return 'default'
}

function resolveType(raw: unknown) {
  if (raw === 0 || raw === 'Production') return '生产入库'
  if (raw === 1 || raw === 'Purchase') return '采购入库'
  if (raw === 2 || raw === 'Other') return '其他'
  return '-'
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function onView(row: ReceiptRow) {
  if (!row.id) {
    message.error('缺少 id，无法查看')
    return
  }
  router.push({ name: 'ReceiptDetail', params: { id: row.id } })
}

function onCreate() {
  createVisible.value = true
}

const columns = computed<DataTableColumns<ReceiptRow>>(() => withResizable([
  { title: '单据号', key: 'billNo', minWidth: 160 },
  {
    title: '类型',
    key: 'type',
    width: 140,
    align: 'center',
    render: (row) => h(NTag, { size: 'small' }, { default: () => resolveType(row.type) }),
  },
  {
    title: '状态',
    key: 'status',
    width: 140,
    align: 'center',
    render: (row) => {
      const status = resolveStatus(row.status)
      return h(NTag, { type: getStatusTagType(status), size: 'small' }, { default: () => status })
    },
  },
  { title: '来源单号', key: 'sourceBillNo', minWidth: 160 },
  {
    title: '创建时间',
    key: 'creationTime',
    minWidth: 180,
    render: (row) => formatDateTime(row.creationTime ?? row.createdTime),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    align: 'center',
    render: (row) =>
      h(NButton, { size: 'small', type: 'primary', quaternary: true, onClick: () => onView(row) }, { default: () => '查看' }),
  },
]))

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <n-card :bordered="false">
      <div class="search-row">
        <n-form inline label-width="90" style="flex: 1">
          <n-form-item label="单据号">
            <n-input v-model:value="query.billNo" placeholder="单据号" clearable />
          </n-form-item>
          <n-form-item label="来源单号">
            <n-input v-model:value="query.sourceBillNo" placeholder="来源单号" clearable />
          </n-form-item>
          <n-form-item label="状态">
            <n-select
              v-model:value="query.status"
              :options="statusOptions"
              placeholder="请选择"
              clearable
              style="width: 160px"
            />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
          </n-form-item>
        </n-form>
        <n-button type="primary" @click="onCreate">新增入库</n-button>
      </div>
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

    <CreateReceiptModal v-model:show="createVisible" @success="loadData" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>