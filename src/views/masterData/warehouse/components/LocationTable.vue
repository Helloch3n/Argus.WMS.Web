<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LocationTable',
})
</script>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPopconfirm,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import { getList, deleteLocation } from '@/api/masterData/location'
import type { LocationDto, GetLocationListParams } from '@/api/masterData/location'
import LocationDialog from './LocationDialog.vue'
import LocationBatchDialog from './LocationBatchDialog.vue'
import { withResizable } from '@/utils/table'

type LocationRow = LocationDto & { id?: string }

const props = defineProps<{
  zoneId: string
  zoneName?: string
  warehouseId?: string
  warehouseCode?: string
  warehouseName?: string
}>()

const loading = ref(false)
const rows = ref<LocationRow[]>([])
const message = useMessage()
const locationDialogRef = ref<any>(null)
const batchDialogRef = ref<any>(null)
const query = ref({ filter: '' })

const filteredRows = computed(() => {
  const kw = (query.value.filter || '').trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter((r) => {
    return [
      r.code,
      r.aisle,
      r.rack,
      r.level,
      r.bin,
    ].some((v) => String(v ?? '').toLowerCase().includes(kw))
  })
})

async function fetchList() {
  if (!props.zoneId) return
  loading.value = true
  try {
    const params: GetLocationListParams = {
      maxResultCount: 9999,
      skipCount: 0,
      zoneId: props.zoneId,
      filter: query.value.filter || undefined,
    }
    const data = await getList(params)
    rows.value = data.items ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  fetchList()
}

function onRefresh() {
  query.value.filter = ''
  fetchList()
}

function onCreate() {
  locationDialogRef.value?.open({
    zoneId: props.zoneId,
    warehouseId: props.warehouseId,
    warehouseCode: props.warehouseCode,
    warehouseName: props.warehouseName,
  })
}

function onEdit(row: LocationRow) {
  locationDialogRef.value?.open({
    zoneId: props.zoneId,
    row,
    warehouseId: props.warehouseId,
    warehouseCode: props.warehouseCode,
    warehouseName: props.warehouseName,
  })
}

function onBatchCreate() {
  batchDialogRef.value?.open(props.zoneId)
}


function getStatusTagType(row: LocationRow) {
  const s = row.status as number | string
  if (s === 0 || s === 'Idle') return 'success'
  if (s === 10 || s === 'Partial') return 'warning'
  if (s === 20 || s === 'Full') return 'error'
  if (s === 30 || s === 'Locked') return 'default'
  return 'default'
}

function getStatusText(row: LocationRow) {
  const s = row.status as number | string
  if (s === 0 || s === 'Idle') return '空闲'
  if (s === 10 || s === 'Partial') return '部分占用'
  if (s === 20 || s === 'Full') return '已满'
  if (s === 30 || s === 'Locked') return '锁定'
  return '未知'
}

function getTypeText(row: LocationRow) {
  const t = row.type
  if (t === 10) return '收货暂存区'
  if (t === 20) return '正式存储区'
  if (t === 30) return '生产线边库'
  if (t === 40) return '质检/隔离区'
  if (t === 50) return '发货暂存区'
  return '-'
}

const columns = computed<DataTableColumns<LocationRow>>(() => withResizable([
  { title: '库位编码', key: 'code', minWidth: 160 },
  { title: '巷道', key: 'aisle', width: 120, align: 'right' },
  { title: '货架', key: 'rack', width: 120, align: 'right' },
  { title: '层', key: 'level', width: 120, align: 'right' },
  { title: '位', key: 'bin', width: 120, align: 'right' },
  { title: '最大容器数', key: 'maxReelCount', width: 140, align: 'right' },
  {
    title: '库位类型',
    key: 'type',
    width: 140,
    align: 'center',
    render: (row: LocationRow) =>
      h(NTag, { size: 'small' }, { default: () => getTypeText(row) }),
  },
  {
    title: '状态',
    key: 'status',
    width: 140,
    align: 'center',
    render: (row: LocationRow) =>
      h(NTag, { type: getStatusTagType(row), size: 'small' }, { default: () => getStatusText(row) }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row: LocationRow) =>
      h(NSpace, { size: 8, justify: 'center' }, {
        default: () => [
          h(
            NButton,
            { size: 'small', type: 'primary', quaternary: true, onClick: () => onEdit(row) },
            { default: () => '编辑' },
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: async () => {
                if (!row.id) return
                await deleteLocation(row.id)
                message.success('删除成功')
                await fetchList()
              },
            },
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
]))

watch(() => props.zoneId, fetchList)
onMounted(fetchList)
</script>

<template>
  <div class="location-table">
    <div class="toolbar">
      <n-form inline label-width="70" class="toolbar-left">
        <n-form-item label="搜索">
          <n-input
            v-model:value="query.filter"
            placeholder="搜索库位编码/巷道/货架"
            clearable
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </n-form-item>
        <n-form-item>
          <n-space :size="8" align="center">
            <n-button size="small" type="primary" :loading="loading" @click="onSearch">查询</n-button>
            <n-button size="small" @click="onRefresh">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>

      <n-space class="toolbar-right" :size="8" align="center">
        <n-button size="small" type="primary" @click="onCreate">+ 新增库位</n-button>
        <n-button size="small" type="primary" @click="onBatchCreate">+ 批量生成</n-button>
      </n-space>
    </div>

    <n-data-table
      :loading="loading"
      :data="filteredRows"
      :columns="columns"
      :bordered="false"
      size="small"
      striped
    />

    <LocationDialog ref="locationDialogRef" @success="fetchList" />
    <LocationBatchDialog ref="batchDialogRef" @success="fetchList" />
  </div>
</template>

<style scoped>
.location-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zone-title {
  font-size: 16px;
  font-weight: 600;
}
</style>