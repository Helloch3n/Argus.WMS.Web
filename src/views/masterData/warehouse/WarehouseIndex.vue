<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DataTableSortState, FormInst, FormRules } from 'naive-ui'

import BaseCrudPage from '@/components/BaseCrudPage.vue'
import TableColumnManager from '@/components/TableColumnManager.vue'
import { useColumnConfig } from '@/composables/useColumnConfig'
import { useTableSelection } from '@/composables/useTableSelection'
import { withResizable } from '@/utils/table'
import {
  getList,
  create,
  update,
  remove,
  type WarehouseDto,
  type CreateUpdateWarehouseDto,
  type WarehousePagedQueryDto,
} from '@/api/masterData/warehouse'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const list = ref<WarehouseDto[]>([])

const permissionCodes = {
  create: 'MasterData.Warehouse.Create',
  update: 'MasterData.Warehouse.Update',
  delete: 'MasterData.Warehouse.Delete',
} as const

function hasPermission(code: string) {
  const raw = localStorage.getItem('auth_permissions')
  if (!raw) return true
  try {
    const permissions = JSON.parse(raw) as string[]
    if (!Array.isArray(permissions)) return true
    return permissions.includes(code)
  } catch {
    return true
  }
}

const canCreate = computed(() => hasPermission(permissionCodes.create))
const canUpdate = computed(() => hasPermission(permissionCodes.update))
const canDelete = computed(() => hasPermission(permissionCodes.delete))

const query = reactive({
  warehouseCode: '',
  warehouseName: '',
  page: 1,
  pageSize: 10,
  sorting: '',
  total: 0,
})

const listParams = computed<WarehousePagedQueryDto>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  sorting: query.sorting || undefined,
  warehouseCode: query.warehouseCode || undefined,
  warehouseName: query.warehouseName || undefined,
}))

function toSorting(s: DataTableSortState | DataTableSortState[] | null): string {
  const state = Array.isArray(s) ? s[0] : s
  if (!state?.columnKey || !state.order) return ''
  return `${String(state.columnKey)} ${state.order === 'descend' ? 'DESC' : 'ASC'}`
}

function formatTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

function getRowKey(row: WarehouseDto) {
  return row.id ?? row.code
}

const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(list, getRowKey)

async function fetchList() {
  loading.value = true
  try {
    const res = await getList(listParams.value)
    list.value = res.items ?? []
    syncCheckedRowKeys()
    query.total = res.totalCount ?? 0
  } catch (e: any) {
    message.error(e?.message ?? '加载失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.warehouseCode = ''
  query.warehouseName = ''
  query.sorting = ''
  query.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  query.page = page
  fetchList()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  fetchList()
}

function handleSortChange(s: DataTableSortState | DataTableSortState[] | null) {
  query.sorting = toSorting(s)
  query.page = 1
  fetchList()
}

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const form = ref<CreateUpdateWarehouseDto>({ code: '', name: '' })

const rules: FormRules = {
  code: [{ required: true, message: '请输入仓库编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入仓库名称', trigger: ['input', 'blur'] }],
}

function handleCreate() {
  dialogMode.value = 'create'
  editId.value = null
  form.value = { code: '', name: '' }
  dialogVisible.value = true
}

function handleEdit(row: WarehouseDto) {
  dialogMode.value = 'edit'
  editId.value = row.id!
  form.value = { code: row.code, name: row.name }
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (dialogMode.value === 'edit' && editId.value) {
    await update(editId.value, form.value)
    message.success('更新成功')
  } else {
    await create(form.value)
    message.success('创建成功')
  }
  dialogVisible.value = false
  await fetchList()
}

const canEditSelected = computed(() => canUpdate.value && selectedCount.value === 1)
const canDeleteSelected = computed(() => canDelete.value && selectedCount.value > 0)

function handleToolbarEdit() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  handleEdit(selected)
}

async function deleteByIds(ids: string[]) {
  loading.value = true
  try {
    await Promise.all(ids.map((id) => remove(id)))
    clearSelection()
    message.success('删除成功')
    await fetchList()
  } finally {
    loading.value = false
  }
}

function handleToolbarDelete() {
  const ids = selectedRows.value
    .map((item) => item.id)
    .filter((item): item is string => Boolean(item))
  if (ids.length === 0) {
    message.warning('请先选择要删除的数据')
    return
  }
  const content = ids.length === 1 ? '确认删除选中仓库吗？' : `确认删除选中的 ${ids.length} 条仓库吗？`
  dialog.warning({
    title: '提示',
    content,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteByIds(ids)
    },
  })
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'warehouse-column-settings-v1',
  preferredKeys: ['code', 'name', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'code') return '仓库编码'
    if (key === 'name') return '仓库名称'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<WarehouseDto>[number]> = {
  code: { title: createDraggableTitle('code', '仓库编码'), key: 'code', minWidth: 140, sorter: 'default' },
  name: { title: createDraggableTitle('name', '仓库名称'), key: 'name', minWidth: 180, sorter: 'default' },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: 'default',
    render: (row) => formatTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<WarehouseDto>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<WarehouseDto>[number] => Boolean(item)),
]))

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
  fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            v-model:value="query.warehouseCode"
            placeholder="请输入仓库编码"
            clearable
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            v-model:value="query.warehouseName"
            placeholder="请输入仓库名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button v-if="canCreate" type="primary" @click="handleCreate">新增</n-button>
        <n-button v-if="canUpdate" :disabled="!canEditSelected" @click="handleToolbarEdit">编辑</n-button>
        <n-button v-if="canDelete" type="error" :disabled="!canDeleteSelected" @click="handleToolbarDelete">删除</n-button>
      </div>
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
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="columns"
        :data="list"
        :bordered="false"
        :row-key="getRowKey"
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event) })"
        :checked-row-keys="checkedRowKeys"
        @update:sorter="handleSortChange"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
      <n-modal v-model:show="dialogVisible">
        <n-card
          :title="dialogMode === 'create' ? '新建仓库' : '编辑仓库'"
          style="width: 500px"
          closable
          @close="dialogVisible = false"
        >
          <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="80">
            <n-form-item label="编码" path="code">
              <n-input v-model:value="form.code" placeholder="如: WH01" />
            </n-form-item>
            <n-form-item label="名称" path="name">
              <n-input v-model:value="form.name" placeholder="如: 主仓库" />
            </n-form-item>
          </n-form>
          <template #action>
            <n-space justify="end">
              <n-button @click="dialogVisible = false">取消</n-button>
              <n-button type="primary" @click="handleSubmit">确定</n-button>
            </n-space>
          </template>
        </n-card>
      </n-modal>
    </template>

    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
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
