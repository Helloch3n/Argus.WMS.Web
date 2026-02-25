<script setup lang="ts">
import { h, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NPopconfirm,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getList as getWarehouseList, type WarehouseDto } from '@/api/masterData/warehouse'
import { getByWarehouseId as getZonesByWarehouse, type ZoneDto } from '@/api/masterData/zone'
import { getList, deleteLocation, type LocationDto } from '@/api/masterData/location'
import LocationDialog, { type LocationDialogExpose } from './components/LocationDialog.vue'
import LocationBatchDialog, { type LocationBatchDialogExpose } from './components/LocationBatchDialog.vue'

const message = useMessage()
const loading = ref(false)
const list = ref<LocationDto[]>([])
const filter = ref('')

const warehouses = ref<WarehouseDto[]>([])
const zones = ref<ZoneDto[]>([])
const selectedWarehouseId = ref<string | null>(null)
const selectedZoneId = ref<string | null>(null)

const warehouseOptions = ref<{ label: string; value: string }[]>([])
const zoneOptions = ref<{ label: string; value: string }[]>([])

async function loadWarehouses() {
  const res = await getWarehouseList()
  warehouses.value = res.items ?? []
  warehouseOptions.value = warehouses.value.map((w) => ({
    label: `${w.code} - ${w.name}`,
    value: w.id!,
  }))
  const first = warehouseOptions.value[0]
  if (first && !selectedWarehouseId.value) {
    selectedWarehouseId.value = first.value
  }
}

async function loadZones() {
  if (!selectedWarehouseId.value) {
    zones.value = []
    zoneOptions.value = []
    return
  }
  const data = await getZonesByWarehouse(selectedWarehouseId.value)
  zones.value = Array.isArray(data) ? data : []
  zoneOptions.value = zones.value.map((z) => ({
    label: `${z.code} - ${z.name}`,
    value: z.id!,
  }))
  const first = zoneOptions.value[0]
  selectedZoneId.value = first ? first.value : null
}

watch(selectedWarehouseId, async () => {
  selectedZoneId.value = null
  await loadZones()
})

watch(selectedZoneId, () => fetchList())

const statusMap: Record<number, { text: string; type: 'success' | 'warning' | 'error' | 'info' }> = {
  0: { text: '空闲', type: 'success' },
  1: { text: '占用', type: 'warning' },
  2: { text: '锁定', type: 'error' },
}
const typeMap: Record<number, string> = {
  10: '收货暂存区',
  20: '正式存储区',
  30: '线边库',
  40: '质检/隔离区',
  50: '发货暂存区',
}

const columns: DataTableColumns<LocationDto> = [
  { title: '库位编码', key: 'code', minWidth: 140 },
  { title: '巷道', key: 'aisle', width: 80, align: 'right' },
  { title: '货架', key: 'rack', width: 80, align: 'right' },
  { title: '层', key: 'level', width: 80, align: 'right' },
  { title: '位', key: 'bin', width: 80, align: 'right' },
  { title: '最大容器数', key: 'maxReelCount', width: 120, align: 'right' },
  {
    title: '类型',
    key: 'type',
    width: 130,
    align: 'center',
    render: (row) => h(NTag, { size: 'small' }, { default: () => typeMap[row.type] ?? '-' }),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    align: 'center',
    render: (row) => {
      const s = statusMap[row.status] ?? { text: '-', type: 'info' as const }
      return h(NTag, { type: s.type, size: 'small' }, { default: () => s.text })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row) =>
      h(NSpace, { size: 8, justify: 'center' }, {
        default: () => [
          h(
            NButton,
            { size: 'small', type: 'primary', quaternary: true, onClick: () => handleEdit(row) },
            { default: () => '编辑' },
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row.id!) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', type: 'error', quaternary: true },
                  { default: () => '删除' },
                ),
              default: () => '确定删除该库位吗？',
            },
          ),
        ],
      }),
  },
]

async function fetchList() {
  if (!selectedZoneId.value) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const res = await getList({
      maxResultCount: 9999,
      skipCount: 0,
      zoneId: selectedZoneId.value,
      filter: filter.value || undefined,
    })
    list.value = res.items ?? []
  } finally {
    loading.value = false
  }
}

const dialogRef = ref<LocationDialogExpose | null>(null)
const batchDialogRef = ref<LocationBatchDialogExpose | null>(null)

function handleCreate() {
  if (!selectedZoneId.value || !selectedWarehouseId.value) {
    message.warning('请先选择仓库和库区')
    return
  }
  dialogRef.value?.open({
    mode: 'create',
    zoneId: selectedZoneId.value,
    warehouseId: selectedWarehouseId.value,
  })
}

function handleEdit(row: LocationDto) {
  dialogRef.value?.open({
    mode: 'edit',
    zoneId: selectedZoneId.value!,
    warehouseId: selectedWarehouseId.value!,
    row,
  })
}

function handleBatchCreate() {
  if (!selectedZoneId.value || !selectedWarehouseId.value) {
    message.warning('请先选择仓库和库区')
    return
  }
  batchDialogRef.value?.open(selectedZoneId.value, selectedWarehouseId.value)
}

async function handleDelete(id: string) {
  try {
    await deleteLocation(id)
    message.success('删除成功')
    await fetchList()
  } catch (e: any) {
    message.error(e?.response?.data?.error?.message ?? '删除失败')
  }
}

onMounted(loadWarehouses)
</script>

<template>
  <n-card title="库位管理">
    <template #header-extra>
      <n-space>
        <n-button @click="handleBatchCreate">批量创建</n-button>
        <n-button type="primary" @click="handleCreate">新建库位</n-button>
      </n-space>
    </template>

    <n-form inline label-width="60" style="margin-bottom: 16px">
      <n-form-item label="仓库">
        <n-select
          v-model:value="selectedWarehouseId"
          :options="warehouseOptions"
          placeholder="请选择仓库"
          style="width: 220px"
          filterable
        />
      </n-form-item>
      <n-form-item label="库区">
        <n-select
          v-model:value="selectedZoneId"
          :options="zoneOptions"
          placeholder="请先选择仓库"
          style="width: 220px"
          filterable
          :disabled="!selectedWarehouseId"
        />
      </n-form-item>
      <n-form-item label="搜索">
        <n-input
          v-model:value="filter"
          placeholder="库位编码/巷道"
          clearable
          style="width: 180px"
          @keyup.enter="fetchList"
        />
      </n-form-item>
      <n-form-item>
        <n-button @click="fetchList">查询</n-button>
      </n-form-item>
    </n-form>

    <n-data-table :loading="loading" :columns="columns" :data="list" :bordered="false" />

    <LocationDialog ref="dialogRef" @success="fetchList" />
    <LocationBatchDialog ref="batchDialogRef" @success="fetchList" />
  </n-card>
</template>
