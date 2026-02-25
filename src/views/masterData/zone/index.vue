<script setup lang="ts">
import { h, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import { getList as getWarehouseList, type WarehouseDto } from '@/api/masterData/warehouse'
import {
  getList as getZoneList,
  create,
  update,
  remove,
  type ZoneDto,
  type CreateUpdateZoneDto,
} from '@/api/masterData/zone'

const message = useMessage()
const loading = ref(false)
const list = ref<ZoneDto[]>([])

const warehouses = ref<WarehouseDto[]>([])
const selectedWarehouseId = ref<string | null>(null)
const warehouseOptions = ref<{ label: string; value: string }[]>([])

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

const zoneTypeMap: Record<number, string> = { 0: '存储区', 1: '收货区', 2: '发货区' }

const columns: DataTableColumns<ZoneDto> = [
  { title: '库区编码', key: 'code', minWidth: 140 },
  { title: '库区名称', key: 'name', minWidth: 160 },
  {
    title: '类型',
    key: 'zoneType',
    width: 120,
    align: 'center',
    render: (row) => h(NTag, { size: 'small' }, { default: () => zoneTypeMap[row.zoneType] ?? '-' }),
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
              default: () => '确定删除该库区吗？删除前请确保已清空其下所有库位。',
            },
          ),
        ],
      }),
  },
]

async function fetchList() {
  if (!selectedWarehouseId.value) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const res = await getZoneList({ warehouseId: selectedWarehouseId.value })
    list.value = res.items ?? []
  } finally {
    loading.value = false
  }
}

watch(selectedWarehouseId, fetchList)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const form = ref({
  code: '',
  name: '',
  zoneType: 0 as number,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入库区编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入库区名称', trigger: ['input', 'blur'] }],
  zoneType: [{ required: true, type: 'number', message: '请选择库区类型', trigger: ['change', 'blur'] }],
}

const zoneTypeOptions = [
  { value: 0, label: 'Storage (存储区)' },
  { value: 1, label: 'Receiving (收货区)' },
  { value: 2, label: 'Shipping (发货区)' },
]

function handleCreate() {
  if (!selectedWarehouseId.value) {
    message.warning('请先选择一个仓库')
    return
  }
  dialogMode.value = 'create'
  editId.value = null
  form.value = { code: '', name: '', zoneType: 0 }
  dialogVisible.value = true
}

function handleEdit(row: ZoneDto) {
  dialogMode.value = 'edit'
  editId.value = row.id!
  form.value = { code: row.code, name: row.name, zoneType: row.zoneType }
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  const payload: CreateUpdateZoneDto = {
    ...form.value,
    warehouseId: selectedWarehouseId.value!,
  }
  if (dialogMode.value === 'edit' && editId.value) {
    await update(editId.value, payload)
    message.success('更新成功')
  } else {
    await create(payload)
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

function getWarehouseName() {
  const wh = warehouses.value.find((w) => w.id === selectedWarehouseId.value)
  return wh ? `${wh.code} - ${wh.name}` : ''
}

onMounted(loadWarehouses)
</script>

<template>
  <n-card title="库区管理">
    <template #header-extra>
      <n-button type="primary" @click="handleCreate">新建库区</n-button>
    </template>

    <n-form inline label-width="60" style="margin-bottom: 16px">
      <n-form-item label="仓库">
        <n-select
          v-model:value="selectedWarehouseId"
          :options="warehouseOptions"
          placeholder="请选择仓库"
          style="width: 260px"
          filterable
        />
      </n-form-item>
    </n-form>

    <n-data-table :loading="loading" :columns="columns" :data="list" :bordered="false" />

    <n-modal v-model:show="dialogVisible">
      <n-card
        :title="dialogMode === 'create' ? '新建库区' : '编辑库区'"
        style="width: 560px"
        closable
        @close="dialogVisible = false"
      >
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="80">
          <n-form-item label="所属仓库">
            <n-input :value="getWarehouseName()" readonly />
          </n-form-item>
          <n-form-item label="编码" path="code">
            <n-input v-model:value="form.code" placeholder="如: WH01-存储区01" />
          </n-form-item>
          <n-form-item label="名称" path="name">
            <n-input v-model:value="form.name" placeholder="如: A区" />
          </n-form-item>
          <n-form-item label="类型" path="zoneType">
            <n-select v-model:value="form.zoneType" :options="zoneTypeOptions" placeholder="请选择类型" />
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
