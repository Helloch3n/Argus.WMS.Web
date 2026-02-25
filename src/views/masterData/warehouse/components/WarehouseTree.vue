<script lang="ts">
export default {
  name: 'WarehouseTree',
}
</script>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NButton, NDropdown, NSpace, NTree, useDialog, useMessage } from 'naive-ui'
import type { DropdownOption, TreeOption } from 'naive-ui'

import { getList, type WarehouseDto, type ZoneDto, remove as removeWarehouse } from '@/api/masterData/warehouse'
import { remove as removeZone } from '@/api/masterData/zone'
import WarehouseDialog from './WarehouseDialog.vue'
import ZoneDialog from './ZoneDialog.vue'

type TreeNode = TreeOption & {
  id: string
  label: string
  type: 'WAREHOUSE' | 'ZONE'
  rawName: string
  warehouseId?: string
  warehouseCode?: string
  warehouseName?: string
  children?: TreeNode[]
}

const emit = defineEmits<{
  'zone-select': [payload: { id: string; name: string; warehouseId?: string; warehouseCode?: string; warehouseName?: string }]
  success: []
}>()

const loading = ref(false)
const rawWarehouses = ref<WarehouseDto[]>([])
const message = useMessage()
const dialog = useDialog()
const selectedKeys = ref<Array<string | number>>([])

type WarehouseDialogExpose = {
  open: (row?: WarehouseDto) => void
}

type ZoneDialogExpose = {
  open: (warehouseId: string | null, warehouseName: string | null, row?: ZoneDto) => void
}

const dialogRef = ref<WarehouseDialogExpose | null>(null)
const zoneDialogRef = ref<ZoneDialogExpose | null>(null)

const treeData = computed<TreeNode[]>(() =>
  (rawWarehouses.value ?? []).map((w, wi) => {
    const warehouseId = w.id ?? `warehouse-${wi}`
    return {
      key: warehouseId,
      id: warehouseId,
      label: w.name ?? '未命名仓库',
      rawName: w.name ?? '未命名仓库',
      type: 'WAREHOUSE' as const,
      children: (w.zones ?? []).map((z, zi) => ({
        key: z.id ?? `${warehouseId}-zone-${zi}`,
        id: z.id ?? `${warehouseId}-zone-${zi}`,
        label: z.name ?? '未命名库区',
        rawName: z.name ?? '未命名库区',
        type: 'ZONE' as const,
        warehouseId,
        warehouseCode: w.code ?? '',
        warehouseName: w.name ?? '',
        children: [],
      })),
    }
  }),
)

async function fetchTree() {
  loading.value = true
  try {
    const data = await getList({ maxResultCount: 9999, skipCount: 0 })
    rawWarehouses.value = data.items ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载仓库失败')
  } finally {
    loading.value = false
  }
}

const loadData = fetchTree

function handleCreate() {
  dialogRef.value?.open()
}

function handleCreateZone(data: TreeNode) {
  zoneDialogRef.value?.open(data.id, data.label)
}

function handleEdit(data: TreeNode) {
  const row = rawWarehouses.value.find((w) => w.id === data.id)
  if (!row) return
  dialogRef.value?.open(row)
}

function handleEditZone(data: TreeNode) {
  const warehouse = rawWarehouses.value.find((w) => (w.zones ?? []).some((z) => z.id === data.id))
  const zoneRow = warehouse?.zones?.find((z) => z.id === data.id)
  if (!zoneRow || !warehouse) return
  zoneDialogRef.value?.open(warehouse.id ?? '', warehouse.name ?? '', zoneRow)
}

async function onWarehouseMenu(command: string, data: TreeNode) {
  if (command === 'create-zone') {
    handleCreateZone(data)
    return
  }
  if (command === 'edit') {
    handleEdit(data)
    return
  }
  if (command === 'delete') {
    dialog.warning({
      title: '提示',
      content: '确定要删除此仓库吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        await removeWarehouse(data.id)
        message.success('删除成功')
        emit('success')
        await loadData()
      },
    })
  }
}

async function onZoneMenu(command: string, data: TreeNode) {
  if (command === 'edit') {
    handleEditZone(data)
    return
  }
  if (command === 'delete') {
    dialog.warning({
      title: '提示',
      content: '确定要删除此库区吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        await removeZone(data.id)
        message.success('删除成功')
        emit('success')
        await loadData()
      },
    })
  }
}

function onSelect(keys: Array<string | number>, options: Array<TreeOption | null>) {
  selectedKeys.value = keys
  const option = options[0] as TreeNode | null
  if (option?.type === 'ZONE' && option.id) {
    emit('zone-select', {
      id: option.id,
      name: option.rawName,
      warehouseId: option.warehouseId,
      warehouseCode: option.warehouseCode,
      warehouseName: option.warehouseName,
    })
  }
}

const warehouseMenuOptions: DropdownOption[] = [
  { label: '新建库区', key: 'create-zone' },
  { label: '编辑', key: 'edit' },
  { label: '删除', key: 'delete' },
]

const zoneMenuOptions: DropdownOption[] = [
  { label: '编辑', key: 'edit' },
  { label: '删除', key: 'delete' },
]

function renderLabel(info: { option: TreeOption }) {
  const option = info.option as TreeNode
  const actionMenu = option.type === 'WAREHOUSE' ? warehouseMenuOptions : zoneMenuOptions

  return h('div', { class: 'node-row' }, [
    h('div', { class: 'node-title' }, [
      h('span', { class: 'node-label' }, option.label as string),
    ]),
    h(
      NSpace,
      { size: 6, class: 'node-actions' },
      {
        default: () => [
          option.type === 'WAREHOUSE'
            ? h(
                NButton,
                {
                  size: 'tiny',
                  type: 'primary',
                  tertiary: true,
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation()
                    handleEdit(option)
                  },
                },
                { default: () => '编辑' },
              )
            : null,
          h(
            NDropdown,
            {
              trigger: 'click',
              options: actionMenu,
              onSelect: (key: string) => {
                if (option.type === 'WAREHOUSE') {
                  onWarehouseMenu(key, option)
                } else {
                  onZoneMenu(key, option)
                }
              },
            },
            {
              default: () =>
                h(
                  NButton,
                  {
                    size: 'tiny',
                    tertiary: true,
                    onClick: (e: MouseEvent) => e.stopPropagation(),
                  },
                  { default: () => '更多' },
                ),
            },
          ),
        ].filter(Boolean),
      },
    ),
  ])
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="warehouse-tree">
    <div class="toolbar">
      <div class="toolbar-title">仓库</div>
      <n-button type="primary" size="small" @click="handleCreate">新建仓库</n-button>
    </div>

    <n-tree
      :loading="loading"
      :data="treeData"
      :render-label="renderLabel"
      block-line
      default-expand-all
      :selected-keys="selectedKeys"
      @update:selected-keys="onSelect"
    />

    <WarehouseDialog ref="dialogRef" @success="loadData" />
    <ZoneDialog ref="zoneDialogRef" @success="emit('success'); loadData()" />
  </div>
</template>

<style scoped>
.warehouse-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-title {
  font-weight: 600;
  color: #0f172a;
}

.node-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 2px 4px;
  border-radius: 6px;
}

.node-row:hover {
  background: #f8fafc;
}

.node-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.node-row:hover .node-actions {
  opacity: 1;
}
</style>