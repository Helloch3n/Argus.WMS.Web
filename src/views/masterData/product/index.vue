<!-- filepath: f:\NetProject\Argus.WMS.Web\src\views\masterData\product\index.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, h } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSpace,
  NSwitch,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import { withResizable } from '@/utils/table'
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductList,
  updateProduct,
  type GetProductListParams,
  type ProductDto,
  type CreateUpdateProductDto,
} from '@/api/masterData/product'

type ProductRow = ProductDto & { id?: string }

const loading = ref(false)
const rows = ref<ProductRow[]>([])
const message = useMessage()
const dialog = useDialog()

const query = reactive<{
  filter: string
  page: number
  pageSize: number
  total: number
}>({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增物料')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const form = reactive<CreateUpdateProductDto>({
  code: '',
  name: '',
  unit: '',
  auxUnit: '',
  conversionRate: 1,
  isBatchManagementEnabled: false,
  shelfLifeDays: null,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
  unit: [{ required: true, message: '请输入单位', trigger: ['input', 'blur'] }],
  auxUnit: [{ required: true, message: '请输入辅助单位', trigger: ['input', 'blur'] }],
  conversionRate: [{ required: true, type: 'number', message: '请输入换算率', trigger: ['input', 'blur'] }],
}

const listParams = computed<GetProductListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  filter: query.filter || undefined,
}))

async function fetchList() {
  loading.value = true
  try {
    const data = await getProductList(listParams.value)
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
  dialogTitle.value = '新增物料'
  Object.assign(form, {
    code: '',
    name: '',
    unit: '',
    auxUnit: '',
    conversionRate: 1,
    isBatchManagementEnabled: false,
    shelfLifeDays: null,
  })
  dialogVisible.value = true
}

async function onEdit(row: ProductRow) {
  if (!row.id) return
  editingId.value = row.id
  dialogTitle.value = '编辑物料'
  const data = await getProduct(row.id)
  Object.assign(form, {
    code: data.code ?? '',
    name: data.name ?? '',
    unit: data.unit ?? '',
    auxUnit: data.auxUnit ?? '',
    conversionRate: data.conversionRate ?? 1,
    isBatchManagementEnabled: data.isBatchManagementEnabled ?? false,
    shelfLifeDays: data.shelfLifeDays ?? null,
  })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    if (editingId.value) {
      await updateProduct(editingId.value, form)
      message.success('更新成功')
    } else {
      await createProduct(form)
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

function onDelete(row: ProductRow) {
  if (!row.id) {
    message.error('缺少 id，无法删除')
    return
  }
  dialog.warning({
    title: '提示',
    content: '确定要删除此物料吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true
      try {
        await deleteProduct(row.id!)
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

const columns = computed<DataTableColumns<ProductRow>>(() => withResizable([
  { title: '编码', key: 'code', minWidth: 140 },
  { title: '名称', key: 'name', minWidth: 180 },
  { title: '单位', key: 'unit', width: 120 },
  { title: '辅助单位', key: 'auxUnit', width: 120 },
  {
    title: '换算率',
    key: 'conversionRate',
    width: 120,
    render: (row) => row.conversionRate ?? '-',
  },
  {
    title: '保质期(天)',
    key: 'shelfLifeDays',
    width: 120,
    render: (row) => row.shelfLifeDays ?? '-',
  },
  {
    title: '是否启用批次',
    key: 'isBatchManagementEnabled',
    width: 160,
    align: 'center',
    render: (row) =>
      h(
        NTag,
        { type: row.isBatchManagementEnabled ? 'success' : 'default', size: 'small' },
        { default: () => (row.isBatchManagementEnabled ? '是' : '否') },
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row) =>
      h(
        NSpace,
        { size: 8, justify: 'center' },
        {
          default: () => [
            h(
              NButton,
              { size: 'small', type: 'primary', quaternary: true, onClick: () => onEdit(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              { size: 'small', type: 'error', quaternary: true, onClick: () => onDelete(row) },
              { default: () => '删除' },
            ),
          ],
        },
      ),
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
          placeholder="请输入关键字（编码/名称）"
          clearable
          style="max-width: 360px"
          @keyup.enter="onQuery"
        />
        <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        <div class="grow" />
        <n-button type="primary" @click="onCreate">新增物料</n-button>
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
      <n-card :title="dialogTitle" style="width: 640px" closable @close="dialogVisible = false">
        <n-form ref="formRef" :model="form" :rules="rules" label-width="100">
          <n-form-item label="编码" path="code">
            <n-input v-model:value="form.code" />
          </n-form-item>
          <n-form-item label="名称" path="name">
            <n-input v-model:value="form.name" />
          </n-form-item>
          <n-form-item label="单位" path="unit">
            <n-input v-model:value="form.unit" />
          </n-form-item>
          <n-form-item label="辅助单位" path="auxUnit">
            <n-input v-model:value="form.auxUnit" />
          </n-form-item>
          <n-form-item label="换算率" path="conversionRate">
            <n-input-number v-model:value="form.conversionRate" :min="0" :step="0.0001" />
          </n-form-item>
          <n-form-item label="保质期(天)" path="shelfLifeDays">
            <n-input-number v-model:value="form.shelfLifeDays" :min="0" :step="1" />
          </n-form-item>
          <n-form-item label="启用批次">
            <n-switch v-model:value="form.isBatchManagementEnabled" />
          </n-form-item>
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

.subtext {
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
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