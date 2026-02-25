<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NPagination,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import { withResizable } from '@/utils/table'
import {
  getList,
  delete as deleteReel,
  type GetReelListParams,
  type ReelDto,
} from '@/api/masterData/reel'
import ReelModal from './components/ReelModal.vue'

type ReelRow = ReelDto

type ReelDialogExpose = {
  open: (row?: ReelRow) => void
}

const loading = ref(false)
const rows = ref<ReelRow[]>([])
const message = useMessage()
const dialog = useDialog()
const dialogRef = ref<ReelDialogExpose | null>(null)

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed<GetReelListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  filter: query.filter || undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleCreate() {
  dialogRef.value?.open()
}

function handleEdit(row: ReelRow) {
  dialogRef.value?.open(row)
}

async function handleDelete(row: ReelRow) {
  if (!row.id) {
    message.error('缺少 id，无法删除')
    return
  }
  const id = row.id
  dialog.warning({
    title: '提示',
    content: '确定要删除此线盘吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true
      try {
        await deleteReel(id)
        message.success('删除成功')
        await loadData()
      } finally {
        loading.value = false
      }
    },
  })
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

function formatWeight(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '-'
  return n
}

function resolveType(raw: unknown) {
  const v = typeof raw === 'number' ? raw : Number(raw)
  if (v === 0) return '铁'
  if (v === 1) return '木'
  if (v === 2) return '塑料'
  return '-'
}

const columns = computed<DataTableColumns<ReelRow>>(() => withResizable([
  {
    title: '盘号',
    key: 'reelNo',
    minWidth: 140,
    render: (row) => row.reelNo ?? '-',
  },
  {
    title: '名称',
    key: 'name',
    minWidth: 180,
    render: (row) => row.name ?? '-',
  },
  {
    title: '类型',
    key: 'type',
    minWidth: 140,
    render: (row) => resolveType(row.type),
  },
  {
    title: '当前位置',
    key: 'currentLocationCode',
    minWidth: 180,
    render: (row) => row.currentLocationCode ?? '-',
  },
  {
    title: '皮重',
    key: 'selfWeight',
    width: 120,
    render: (row) => `${formatWeight(row.selfWeight)} kg`,
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
  {
    title: '锁定',
    key: 'isLocked',
    width: 100,
    align: 'center',
    render: (row) => {
      const locked = row.isLocked
      return h(
        NTag,
        { type: locked ? 'warning' : 'success', size: 'small' },
        { default: () => (locked ? '是' : '否') },
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row) =>
      h(
        NSpace,
        { size: 6, justify: 'center' },
        {
          default: () => [
            h(
              NButton,
              { text: true, type: 'primary', onClick: () => handleEdit(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              { text: true, type: 'error', onClick: () => handleDelete(row) },
              { default: () => '删除' },
            ),
          ],
        },
      ),
  },
]))

onMounted(() => {
  loadData()
})
</script>

<template>
  <n-card :bordered="false">
    <n-space justify="space-between" align="center" class="toolbar">
      <n-space align="center">
        <n-input
          v-model:value="query.filter"
          placeholder="请输入关键字"
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
        />
        <n-button type="primary" :loading="loading" @click="handleSearch">搜索</n-button>
      </n-space>

      <n-button type="primary" @click="handleCreate">新建线盘</n-button>
    </n-space>

    <n-data-table :loading="loading" :columns="columns" :data="rows" :bordered="false" />

    <div class="pager">
      <n-pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="loadData"
        @update:page-size="loadData"
      />
    </div>

    <ReelModal ref="dialogRef" @success="loadData" />
  </n-card>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>