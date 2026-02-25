<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as inventoryApi from '@/api/masterData/inventory'

type InventoryRow = inventoryApi.Inventory

type InventoryQueryParams = inventoryApi.GetInventoryListParams & {
  reelNo?: string
  product?: string
  sourceWo?: string
}

const loading = ref(false)
const rows = ref<InventoryRow[]>([])
const message = useMessage()

const query = reactive({
  reelNo: '',
  product: '',
  sourceWo: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed<InventoryQueryParams>(() => {
  const filterText = [query.reelNo, query.product, query.sourceWo].filter(Boolean).join(' ')
  return {
    maxResultCount: query.pageSize,
    skipCount: (query.page - 1) * query.pageSize,
    filter: filterText || undefined,
    reelNo: query.reelNo || undefined,
    product: query.product || undefined,
    sourceWo: query.sourceWo || undefined,
  }
})

function normalizeLayerIndex(row: InventoryRow): number {
  const anyRow = row as InventoryRow & { layer?: unknown; layer_index?: unknown }
  const raw = anyRow.layerIndex ?? anyRow.layer ?? anyRow.layer_index
  const n = typeof raw === 'number' ? raw : Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

async function loadData() {
  loading.value = true
  try {
    const data = await inventoryApi.getList(listParams.value)
    const items = data.items ?? []
    rows.value = items.map((row) => ({
      ...row,
      layerIndex: normalizeLayerIndex(row),
    }))
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


function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function resolveStatus(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'Empty') return '空闲'
    if (raw === 'Occupied') return '占用'
    if (raw === 'Damaged') return '损坏'
    return '空闲'
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '空闲'
    if (raw === 1) return '占用'
    if (raw === 2) return '损坏'
  }
  return '空闲'
}

function getStatusTagType(status: string) {
  if (status === '空闲') return 'success'
  if (status === '占用') return 'warning'
  if (status === '损坏') return 'error'
  return 'default'
}

function resolveLayer(row: InventoryRow) {
  const v = row.layerIndex
  return typeof v === 'number' ? v : Number(v ?? 0)
}

const maxLayerByReel = computed(() => {
  const map = new Map<string, number>()
  for (const row of rows.value) {
    const reelNo = row.reelNo
    if (!reelNo) continue
    const layer = resolveLayer(row)
    const current = map.get(reelNo)
    if (current === undefined || layer > current) {
      map.set(reelNo, layer)
    }
  }
  return map
})

function isMaxLayer(row: InventoryRow) {
  const reelNo = row.reelNo
  if (!reelNo) return false
  const maxLayer = maxLayerByReel.value.get(reelNo)
  return typeof maxLayer === 'number' && resolveLayer(row) === maxLayer
}

const columns = computed<DataTableColumns<InventoryRow>>(() => [
  {
    title: '载具信息 (L1)',
    key: 'l1',
    children: [
      {
        title: '盘号',
        key: 'reelNo',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => h('strong', row.reelNo ?? '-'),
      },
      {
        title: '库位',
        key: 'locationCode',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => row.locationCode ?? '-',
      },
      {
        title: '状态',
        key: 'status',
        width: 140,
        align: 'center',
        render: (row) => {
          const status = resolveStatus(row.status)
          return h(
            NTag,
            { type: getStatusTagType(status), size: 'small' },
            { default: () => status },
          )
        },
      },
    ],
  },
  {
    title: '物料信息 (L2)',
    key: 'l2',
    children: [
      {
        title: '产品编码',
        key: 'productCode',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => row.productCode ?? '-',
      },
      {
        title: '物料名称',
        key: 'productName',
        minWidth: 200,
        ellipsis: { tooltip: true },
        render: (row) => row.productName ?? '-',
      },
      {
        title: '库存数量',
        key: 'quantity',
        width: 140,
        render: (row) => row.quantity ?? 0,
      },
      {
        title: '单位',
        key: 'unit',
        width: 100,
        render: (row) => row.unit ?? '-',
      },
      {
        title: '可用数量',
        key: 'availableQuantity',
        width: 140,
        render: (row) => row.availableQuantity ?? 0,
      },
      {
        title: '锁定数量',
        key: 'lockedQuantity',
        width: 140,
        render: (row) => row.lockedQuantity ?? 0,
      },
      {
        title: '净重',
        key: 'weight',
        width: 140,
        render: (row) => `${row.weight ?? 0} `,
      },
      {
        title: '批次',
        key: 'batchNo',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => row.batchNo ?? '-',
      },
      {
        title: '来源工单',
        key: 'sourceWo',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => row.sourceWo ?? '-',
      },
      {
        title: 'SN',
        key: 'sn',
        minWidth: 160,
        ellipsis: { tooltip: true },
        render: (row) => row.sn ?? '-',
      },
      {
        title: '工艺版本',
        key: 'craftVersion',
        minWidth: 140,
        ellipsis: { tooltip: true },
        render: (row) => row.craftVersion ?? '-',
      },
      {
        title: 'FIFO日期',
        key: 'fifoDate',
        minWidth: 180,
        render: (row) => formatDateTime(row.fifoDate),
      },
    ],
  },
  {
    title: '结构信息 (L3)',
    key: 'l3',
    children: [
      {
        title: '缠绕层级',
        key: 'layer',
        minWidth: 140,
        width: undefined,
        align: 'center',
        render: (row) => {
          const layer = resolveLayer(row)
          if (!Number.isFinite(layer)) return '-'
          if (isMaxLayer(row)) {
            return h(
              NTag,
              { type: 'error', size: 'small' },
              { default: () => `第 ${layer} 段` },
            )
          }
          return h('span', `第 ${layer} 段`)
        },
      },
    ],
  },
])

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <n-card class="search-card" :bordered="false">
      <n-form inline label-width="80">
        <n-form-item label="盘号">
          <n-input v-model:value="query.reelNo" placeholder="线盘号" clearable />
        </n-form-item>
        <n-form-item label="物料">
          <n-input v-model:value="query.product" placeholder="产品/物料" clearable />
        </n-form-item>
        <n-form-item label="工单">
          <n-input v-model:value="query.sourceWo" placeholder="来源工单" clearable />
        </n-form-item>

        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>

        <n-form-item class="grow" />
      </n-form>
    </n-card>

    <n-card :bordered="false">
      <div style="overflow-x: auto;">
        <n-data-table
          :loading="loading"
          :columns="columns"
          :data="rows"
          :bordered="false"
          :scroll-x="3200"
        />
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card {
  width: 100%;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.grow {
  flex: 1 1 auto;
}
</style>