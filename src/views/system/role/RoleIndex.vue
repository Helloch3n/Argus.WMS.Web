<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSpace,
  NSwitch,
  NTag,
  NTree,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, TreeOption } from 'naive-ui'

import BaseCrudPage from '@/components/BaseCrudPage.vue'
import TableColumnManager from '@/components/TableColumnManager.vue'
import * as rolesApi from '@/api/identity/roles'
import type {
  GetIdentityRolesParams,
  IdentityRoleCreateDto,
  IdentityRoleDto,
  PermissionGrantInfoDto,
} from '@/api/identity/types'
import * as permissionApi from '@/api/permissionManagement/permissions'
import { useColumnConfig } from '@/composables/useColumnConfig'
import { compareSortValue } from '@/utils/tableColumn'
import { withResizable } from '@/utils/table'

type RoleRow = IdentityRoleDto

const message = useMessage()

const loading = ref(false)
const rows = ref<RoleRow[]>([])

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive<IdentityRoleCreateDto>({
  name: '',
  isDefault: false,
  isPublic: true,
})

const permissionDrawerVisible = ref(false)
const permissionLoading = ref(false)
const permissionSaving = ref(false)
const currentRole = ref<RoleRow | null>(null)
const permissionTree = ref<TreeOption[]>([])
const checkedPermissionKeys = ref<string[]>([])
const allPermissionKeys = ref<string[]>([])

const listParams = computed<GetIdentityRolesParams>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  filter: query.filter.trim() || undefined,
}))

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'role-management-column-settings-v1',
  preferredKeys: ['name', 'isDefault', 'isPublic'],
  resolveTitle: (key) => {
    if (key === 'name') return '角色名'
    if (key === 'isDefault') return '是否默认'
    if (key === 'isPublic') return '是否公开'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RoleRow>[number]> = {
  name: {
    title: createDraggableTitle('name', '角色名'),
    key: 'name',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.name, b.name),
  },
  isDefault: {
    title: createDraggableTitle('isDefault', '是否默认'),
    key: 'isDefault',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isDefault, b.isDefault),
    render: (row) => h(NTag, { type: row.isDefault ? 'success' : 'default', size: 'small' }, { default: () => (row.isDefault ? '是' : '否') }),
  },
  isPublic: {
    title: createDraggableTitle('isPublic', '是否公开'),
    key: 'isPublic',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isPublic, b.isPublic),
    render: (row) => h(NTag, { type: row.isPublic ? 'success' : 'default', size: 'small' }, { default: () => (row.isPublic ? '是' : '否') }),
  },
}

const columns = computed<DataTableColumns<RoleRow>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RoleRow>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          quaternary: true,
          onClick: () => openPermissionDrawer(row),
        },
        { default: () => '权限' },
      ),
  },
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await rolesApi.getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载角色列表失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadData()
}

function onReset() {
  query.filter = ''
  query.page = 1
  loadData()
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

function openCreate() {
  createForm.name = ''
  createForm.isDefault = false
  createForm.isPublic = true
  createVisible.value = true
}

async function submitCreate() {
  const name = createForm.name.trim()
  if (!name) {
    message.warning('请输入角色名')
    return
  }

  creating.value = true
  try {
    await rolesApi.create({
      name,
      isDefault: createForm.isDefault,
      isPublic: createForm.isPublic,
    })
    message.success('新增角色成功')
    createVisible.value = false
    onQuery()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新增角色失败')
  } finally {
    creating.value = false
  }
}

function buildPermissionTree(permissions: PermissionGrantInfoDto[]) {
  const rootChildren: TreeOption[] = []
  const allKeys: string[] = []
  const checkedKeys: string[] = []

  const permissionNodeMap = new Map<string, TreeOption>()

  for (const permission of permissions) {
    const key = permission.name
    const node: TreeOption = {
      key,
      label: permission.displayName || permission.name,
      children: [],
    }
    permissionNodeMap.set(key, node)
    allKeys.push(key)
    if (permission.isGranted) {
      checkedKeys.push(key)
    }
  }

  for (const permission of permissions) {
    const node = permissionNodeMap.get(permission.name)
    if (!node) continue

    const parentName = permission.parentName
    if (parentName && permissionNodeMap.has(parentName)) {
      const parentNode = permissionNodeMap.get(parentName)
      if (!parentNode) continue
      const children = (parentNode.children ?? []) as TreeOption[]
      children.push(node)
      parentNode.children = children
    } else {
      rootChildren.push(node)
    }
  }

  return {
    tree: rootChildren,
    allKeys,
    checkedKeys,
  }
}

async function openPermissionDrawer(role: RoleRow) {
  currentRole.value = role
  permissionDrawerVisible.value = true
  permissionLoading.value = true
  checkedPermissionKeys.value = []
  allPermissionKeys.value = []

  try {
    const data = await permissionApi.getPermissions({
      providerName: 'R',
      providerKey: role.name,
    })

    const groupNodes: TreeOption[] = []
    const allKeys: string[] = []
    const checkedKeys: string[] = []

    for (const group of data.groups ?? []) {
      const result = buildPermissionTree(group.permissions ?? [])
      allKeys.push(...result.allKeys)
      checkedKeys.push(...result.checkedKeys)

      groupNodes.push({
        key: `group:${group.name}`,
        label: group.displayName || group.name,
        checkboxDisabled: true,
        children: result.tree,
      })
    }

    permissionTree.value = groupNodes
    allPermissionKeys.value = Array.from(new Set(allKeys))
    checkedPermissionKeys.value = Array.from(new Set(checkedKeys))
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载权限树失败')
    permissionTree.value = []
    allPermissionKeys.value = []
    checkedPermissionKeys.value = []
  } finally {
    permissionLoading.value = false
  }
}

function handlePermissionChecked(keys: Array<string | number>) {
  const validKeySet = new Set(allPermissionKeys.value)
  checkedPermissionKeys.value = keys
    .map((key) => String(key))
    .filter((key) => validKeySet.has(key))
}

function selectAllPermissions() {
  checkedPermissionKeys.value = [...allPermissionKeys.value]
}

function invertPermissions() {
  const checkedSet = new Set(checkedPermissionKeys.value)
  checkedPermissionKeys.value = allPermissionKeys.value.filter((key) => !checkedSet.has(key))
}

async function savePermissions() {
  if (!currentRole.value) return

  permissionSaving.value = true
  try {
    const checkedSet = new Set(checkedPermissionKeys.value)
    await permissionApi.updatePermissions(
      {
        providerName: 'R',
        providerKey: currentRole.value.name,
      },
      {
        permissions: allPermissionKeys.value.map((name) => ({
          name,
          isGranted: checkedSet.has(name),
        })),
      },
    )
    message.success('保存权限成功')
    permissionDrawerVisible.value = false
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存权限失败')
  } finally {
    permissionSaving.value = false
  }
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
          <n-input v-model:value="query.filter" clearable placeholder="请输入角色名" @keyup.enter="onQuery" />
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

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" @click="openCreate">新增</n-button>
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
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
    </template>

    <template #pager-right>
      <n-pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>

  <n-modal v-model:show="createVisible" preset="card" title="新增角色" style="width: 480px">
    <n-form label-width="90">
      <n-form-item label="角色名" required>
        <n-input v-model:value="createForm.name" maxlength="64" show-count />
      </n-form-item>
      <n-form-item label="默认角色">
        <n-switch v-model:value="createForm.isDefault" />
      </n-form-item>
      <n-form-item label="公开角色">
        <n-switch v-model:value="createForm.isPublic" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="createVisible = false">取消</n-button>
        <n-button type="primary" :loading="creating" @click="submitCreate">保存</n-button>
      </div>
    </template>
  </n-modal>

  <n-drawer v-model:show="permissionDrawerVisible" placement="right" :width="560">
    <n-drawer-content :title="`权限分配 - ${currentRole?.name ?? ''}`" closable>
      <n-space vertical :size="12">
        <n-card :bordered="false" size="small">
          <div class="drawer-tools">
            <n-space>
              <n-button size="small" @click="selectAllPermissions">全选</n-button>
              <n-button size="small" @click="invertPermissions">反选</n-button>
            </n-space>
            <n-button type="primary" :loading="permissionSaving" @click="savePermissions">保存</n-button>
          </div>
        </n-card>

        <n-card :bordered="false" size="small">
          <n-tree
            block-line
            checkable
            selectable
            default-expand-all
            :data="permissionTree"
            :checked-keys="checkedPermissionKeys"
            :loading="permissionLoading"
            @update:checked-keys="handlePermissionChecked"
          />
        </n-card>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.drawer-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
