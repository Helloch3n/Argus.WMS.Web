<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as inventoryApi from '@/api/masterData/inventory'
import BaseCrudPage from '@/components/BaseCrudPage.vue'
import TableColumnManager from '@/components/TableColumnManager.vue'
import { useColumnConfig } from '@/composables/useColumnConfig'
import { compareSortValue } from '@/utils/tableColumn'
import { withResizable } from '@/utils/table'

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

function onReset() {
  query.reelNo = ''
  query.product = ''
  query.sourceWo = ''
  onQuery()
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

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'inventory-column-settings-v1',
  preferredKeys: [
    'reelNo',
    'locationCode',
    'status',
    'productCode',
    'productName',
    'quantity',
    'unit',
    'availableQuantity',
    'lockedQuantity',
    'weight',
    'batchNo',
    'sourceWo',
    'sn',
    'craftVersion',
    'fifoDate',
    'layer',
  ],
  resolveTitle: (key) => {
    if (key === 'reelNo') return '盘号'
    if (key === 'locationCode') return '库位'
    if (key === 'status') return '状态'
    if (key === 'productCode') return '产品编码'
    if (key === 'productName') return '物料名称'
    if (key === 'quantity') return '库存数量'
    if (key === 'unit') return '单位'
    if (key === 'availableQuantity') return '可用数量'
    if (key === 'lockedQuantity') return '锁定数量'
    if (key === 'weight') return '净重'
    if (key === 'batchNo') return '批次'
    if (key === 'sourceWo') return '来源工单'
    if (key === 'sn') return 'SN'
    if (key === 'craftVersion') return '工艺版本'
    if (key === 'fifoDate') return 'FIFO日期'
    if (key === 'layer') return '缠绕层级'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<InventoryRow>[number]> = {
  reelNo: { title: createDraggableTitle('reelNo', '盘号'), key: 'reelNo', minWidth: 160, sorter: (a, b) => compareSortValue(a.reelNo, b.reelNo), render: (row) => h('strong', row.reelNo ?? '-') },
  locationCode: { title: createDraggableTitle('locationCode', '库位'), key: 'locationCode', minWidth: 160, sorter: (a, b) => compareSortValue(a.locationCode, b.locationCode), render: (row) => row.locationCode ?? '-' },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveStatus(a.status), resolveStatus(b.status)),
    render: (row) => {
      const status = resolveStatus(row.status)
      return h(NTag, { type: getStatusTagType(status), size: 'small' }, { default: () => status })
    },
  },
  productCode: { title: createDraggableTitle('productCode', '产品编码'), key: 'productCode', minWidth: 160, sorter: (a, b) => compareSortValue(a.productCode, b.productCode), render: (row) => row.productCode ?? '-' },
  productName: { title: createDraggableTitle('productName', '物料名称'), key: 'productName', minWidth: 200, sorter: (a, b) => compareSortValue(a.productName, b.productName), render: (row) => row.productName ?? '-' },
  quantity: { title: createDraggableTitle('quantity', '库存数量'), key: 'quantity', width: 140, sorter: (a, b) => compareSortValue(a.quantity, b.quantity), render: (row) => row.quantity ?? 0 },
  unit: { title: createDraggableTitle('unit', '单位'), key: 'unit', width: 100, sorter: (a, b) => compareSortValue(a.unit, b.unit), render: (row) => row.unit ?? '-' },
  availableQuantity: { title: createDraggableTitle('availableQuantity', '可用数量'), key: 'availableQuantity', width: 140, sorter: (a, b) => compareSortValue(a.availableQuantity, b.availableQuantity), render: (row) => row.availableQuantity ?? 0 },
  lockedQuantity: { title: createDraggableTitle('lockedQuantity', '锁定数量'), key: 'lockedQuantity', width: 140, sorter: (a, b) => compareSortValue(a.lockedQuantity, b.lockedQuantity), render: (row) => row.lockedQuantity ?? 0 },
  weight: { title: createDraggableTitle('weight', '净重'), key: 'weight', width: 140, sorter: (a, b) => compareSortValue(a.weight, b.weight), render: (row) => `${row.weight ?? 0}` },
  batchNo: { title: createDraggableTitle('batchNo', '批次'), key: 'batchNo', minWidth: 160, sorter: (a, b) => compareSortValue(a.batchNo, b.batchNo), render: (row) => row.batchNo ?? '-' },
  sourceWo: { title: createDraggableTitle('sourceWo', '来源工单'), key: 'sourceWo', minWidth: 160, sorter: (a, b) => compareSortValue(a.sourceWo, b.sourceWo), render: (row) => row.sourceWo ?? '-' },
  sn: { title: createDraggableTitle('sn', 'SN'), key: 'sn', minWidth: 160, sorter: (a, b) => compareSortValue(a.sn, b.sn), render: (row) => row.sn ?? '-' },
  craftVersion: { title: createDraggableTitle('craftVersion', '工艺版本'), key: 'craftVersion', minWidth: 140, sorter: (a, b) => compareSortValue(a.craftVersion, b.craftVersion), render: (row) => row.craftVersion ?? '-' },
  fifoDate: { title: createDraggableTitle('fifoDate', 'FIFO日期'), key: 'fifoDate', minWidth: 180, sorter: (a, b) => compareSortValue(a.fifoDate, b.fifoDate), render: (row) => formatDateTime(row.fifoDate) },
  layer: {
    title: createDraggableTitle('layer', '缠绕层级'),
    key: 'layer',
    minWidth: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveLayer(a), resolveLayer(b)),
    render: (row) => {
      const layer = resolveLayer(row)
      if (!Number.isFinite(layer)) return '-'
      if (isMaxLayer(row)) {
        return h(NTag, { type: 'error', size: 'small' }, { default: () => `第 ${layer} 段` })
      }
      return h('span', `第 ${layer} 段`)
    },
  },
}

const columns = computed<DataTableColumns<InventoryRow>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<InventoryRow>[number] => Boolean(item)),
))

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input v-model:value="query.reelNo" placeholder="请输入盘号" clearable />
        </n-form-item>
        <n-form-item>
          <n-input v-model:value="query.product" placeholder="请输入物料" clearable />
        </n-form-item>
        <n-form-item>
          <n-input v-model:value="query.sourceWo" placeholder="请输入工单" clearable />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <TableColumnManager
          :show="showColumnConfig"
          :settings="columnSettings"
          @update:show="handleColumnConfigShowChange"
          @visible-change="handleColumnVisibleChange"
        />
      </div>
    </template>

    <template #data>
      <div style="overflow-x: auto;">
        <n-data-table
          class="crud-table-flat"
          :loading="loading"
          :columns="columns"
          :data="rows"
          :bordered="false"
        />
      </div>
    </template>

    <template #pager-right>
      <n-pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10,20,50,100]"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
</style>