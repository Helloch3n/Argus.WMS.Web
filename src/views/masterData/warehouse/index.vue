<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import {
  getList,
  create,
  update,
  remove,
  type WarehouseDto,
  type CreateUpdateWarehouseDto,
} from '@/api/masterData/warehouse'

const message = useMessage()
const loading = ref(false)
const list = ref<WarehouseDto[]>([])

const columns: DataTableColumns<WarehouseDto> = [
  { title: '仓库编码', key: 'code', minWidth: 120 },
  { title: '仓库名称', key: 'name', minWidth: 160 },
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
            {
              size: 'small',
              type: 'primary',
              quaternary: true,
              onClick: () => handleEdit(row),
            },
            { default: () => '编辑' },
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row.id!),
            },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', type: 'error', quaternary: true },
                  { default: () => '删除' },
                ),
              default: () => '确定删除该仓库吗？删除前请确保已清空其下所有库区。',
            },
          ),
        ],
      }),
  },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getList()
    list.value = res.items ?? []
  } finally {
    loading.value = false
  }
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

async function handleDelete(id: string) {
  try {
    await remove(id)
    message.success('删除成功')
    await fetchList()
  } catch (e: any) {
    message.error(e?.response?.data?.error?.message ?? '删除失败')
  }
}

onMounted(fetchList)
</script>

<template>
  <n-card title="仓库管理">
    <template #header-extra>
      <n-button type="primary" @click="handleCreate">新建仓库</n-button>
    </template>

    <n-data-table :loading="loading" :columns="columns" :data="list" :bordered="false" />

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
  </n-card>
</template>