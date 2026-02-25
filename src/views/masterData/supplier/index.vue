<script setup lang="ts">
import { computed, onMounted, reactive, ref, h } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NModal,
  NPagination,
  NSpace,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import SupplierForm from './SupplierForm.vue'
import { withResizable } from '@/utils/table'
import {
  getList,
  get,
  create,
  update,
  remove,
  type GetSupplierListParams,
  type SupplierDto,
  type CreateUpdateSupplierDto,
} from '@/api/masterData/supplier'

type SupplierRow = SupplierDto & { id?: string }

const loading = ref(false)
const rows = ref<SupplierRow[]>([])
const message = useMessage()
const dialog = useDialog()

const query = reactive<{
  filter: string
  page: number
  pageSize: number
  sorting: string
  total: number
}>({
  filter: '',
  page: 1,
  pageSize: 10,
  sorting: '',
  total: 0,
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增供应商')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const form = reactive<CreateUpdateSupplierDto>({
  code: '',
  name: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入编号', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
}

const listParams = computed<GetSupplierListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  sorting: query.sorting || undefined,
  filter: query.filter || undefined,
}))

async function fetchList() {
  loading.value = true
  try {
    const data = await getList(listParams.value)
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
  fetchList()
}

function onCreate() {
  editingId.value = null
  dialogTitle.value = '新增供应商'
  Object.assign(form, { code: '', name: '', contactPerson: '', mobile: '', email: '', address: '' })
  dialogVisible.value = true
}

async function onEdit(row: SupplierRow) {
  if (!row.id) return
  editingId.value = row.id
  dialogTitle.value = '编辑供应商'
  const data = await get(row.id)
  Object.assign(form, {
    code: data.code ?? '',
    name: data.name ?? '',
    contactPerson: data.contactPerson ?? '',
    mobile: data.mobile ?? '',
    email: data.email ?? '',
    address: data.address ?? '',
  })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    if (editingId.value) {
      await update(editingId.value, form)
      message.success('更新成功')
    } else {
      await create(form)
      message.success('创建成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    loading.value = false
  }
}

function onDelete(row: SupplierRow) {
  if (!row.id) return
  dialog.warning({
    title: '提示',
    content: '确定要删除此供应商吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true
      try {
        await remove(row.id!)
        message.success('删除成功')
        await fetchList()
      } finally {
        loading.value = false
      }
    },
  })
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

const columns = computed<DataTableColumns<SupplierRow>>(() => withResizable([
  { title: '编号', key: 'code', minWidth: 140 },
  { title: '名称', key: 'name', minWidth: 180 },
  { title: '联系人', key: 'contactPerson', minWidth: 120 },
  { title: '电话', key: 'mobile', minWidth: 140 },
  { title: '邮箱', key: 'email', minWidth: 180 },
  { title: '地址', key: 'address', minWidth: 220 },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row) =>
      h(NSpace, { size: 8, justify: 'center' }, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', quaternary: true, onClick: () => onEdit(row) }, { default: () => '编辑' }),
          h(NButton, { size: 'small', type: 'error', quaternary: true, onClick: () => onDelete(row) }, { default: () => '删除' }),
        ],
      }),
  },
]))

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="page">
    <n-card class="search-card" :bordered="false">
      <div class="search-row">
        <n-input
          v-model:value="query.filter"
          placeholder="请输入关键字（编号/名称）"
          clearable
          style="max-width: 360px"
          @keyup.enter="onQuery"
        />
        <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        <div class="grow" />
        <n-button type="primary" @click="onCreate">新增供应商</n-button>
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

    <n-modal v-model:show="dialogVisible">
      <n-card :title="dialogTitle" style="width: 720px" closable @close="dialogVisible = false">
        <n-form ref="formRef" :model="form" :rules="rules" label-width="100">
          <SupplierForm v-model="form" />
        </n-form>
        <template #footer>
          <div class="modal-actions">
            <n-button @click="dialogVisible = false">取消</n-button>
            <n-button type="primary" :loading="loading" @click="onSubmit">保存</n-button>
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

.search-card {
  width: 100%;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.grow {
  flex: 1 1 auto;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>