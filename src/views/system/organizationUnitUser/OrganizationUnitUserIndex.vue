<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NTag,
  NTree,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, TreeOption } from 'naive-ui'

import BaseCrudPage from '@/components/BaseCrudPage.vue'
import TableColumnManager from '@/components/TableColumnManager.vue'
import {
  organizationUnitsApi,
  usersApi,
  type GetIdentityUsersParams,
  type IdentityUserDto,
  type OrganizationUnitDto,
} from '@/api/identity'
import { useColumnConfig } from '@/composables/useColumnConfig'
import { compareSortValue } from '@/utils/tableColumn'
import { withResizable } from '@/utils/table'

type MemberRow = IdentityUserDto

const message = useMessage()
const dialog = useDialog()

const treeLoading = ref(false)
const memberLoading = ref(false)
const addMemberLoading = ref(false)

const treeData = ref<OrganizationUnitDto[]>([])
const selectedOuId = ref<string>('')
const selectedOuName = ref('')

const memberRows = ref<MemberRow[]>([])
const checkedMemberRowKeys = ref<string[]>([])
const memberFilter = ref('')
const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const addMemberVisible = ref(false)
const allUserRows = ref<IdentityUserDto[]>([])
const checkedAddUserKeys = ref<string[]>([])
const userFilter = ref('')
const userPager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const treeOptions = computed<TreeOption[]>(() => mapTreeOptions(treeData.value))

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'department-user-column-settings-v1',
  preferredKeys: ['userName', 'name', 'email', 'phoneNumber', 'isActive'],
  resolveTitle: (key) => {
    if (key === 'userName') return '用户名'
    if (key === 'name') return '姓名'
    if (key === 'email') return '邮箱'
    if (key === 'phoneNumber') return '手机号'
    if (key === 'isActive') return '状态'
    return key
  },
})

const memberColumnMap: Record<string, DataTableColumns<MemberRow>[number]> = {
  userName: {
    title: createDraggableTitle('userName', '用户名'),
    key: 'userName',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.userName, b.userName),
  },
  name: {
    title: createDraggableTitle('name', '姓名'),
    key: 'name',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(`${a.name ?? ''}${a.surname ?? ''}`, `${b.name ?? ''}${b.surname ?? ''}`),
    render: (row) => [row.name, row.surname].filter(Boolean).join(' ') || '-',
  },
  email: {
    title: createDraggableTitle('email', '邮箱'),
    key: 'email',
    minWidth: 220,
    sorter: (a, b) => compareSortValue(a.email, b.email),
    render: (row) => row.email || '-',
  },
  phoneNumber: {
    title: createDraggableTitle('phoneNumber', '手机号'),
    key: 'phoneNumber',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.phoneNumber, b.phoneNumber),
    render: (row) => row.phoneNumber || '-',
  },
  isActive: {
    title: createDraggableTitle('isActive', '状态'),
    key: 'isActive',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isActive, b.isActive),
    render: (row) =>
      h(
        NTag,
        { type: row.isActive === false ? 'default' : 'success', size: 'small' },
        { default: () => (row.isActive === false ? '禁用' : '启用') },
      ),
  },
}

const memberColumns = computed<DataTableColumns<MemberRow>>(() => withResizable([
  { type: 'selection', width: 44, align: 'center' },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => memberColumnMap[item.key])
    .filter((item): item is DataTableColumns<MemberRow>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

const addUserColumns: DataTableColumns<IdentityUserDto> = [
  { type: 'selection', width: 44, align: 'center' },
  { title: '用户名', key: 'userName', minWidth: 140 },
  { title: '姓名', key: 'name', minWidth: 140, render: (row) => [row.name, row.surname].filter(Boolean).join(' ') || '-' },
  { title: '邮箱', key: 'email', minWidth: 220, render: (row) => row.email || '-' },
]

function mapTreeOptions(list: OrganizationUnitDto[]): TreeOption[] {
  return list.map((item) => ({
    key: item.id,
    label: item.displayName,
    children: item.children?.length ? mapTreeOptions(item.children) : undefined,
  }))
}

function findOuById(list: OrganizationUnitDto[], id: string): OrganizationUnitDto | null {
  if (!id) return null
  for (const item of list) {
    if (item.id === id) return item
    if (item.children?.length) {
      const found = findOuById(item.children, id)
      if (found) return found
    }
  }
  return null
}

async function loadOuTree() {
  treeLoading.value = true
  try {
    const data = await organizationUnitsApi.getTree()
    treeData.value = data.items ?? []
    if (!selectedOuId.value && treeData.value.length > 0) {
      selectedOuId.value = treeData.value[0]?.id ?? ''
      selectedOuName.value = treeData.value[0]?.displayName ?? ''
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载组织机构失败')
  } finally {
    treeLoading.value = false
  }
}

async function loadMembers() {
  if (!selectedOuId.value) {
    memberRows.value = []
    pager.total = 0
    return
  }

  memberLoading.value = true
  try {
    const data = await organizationUnitsApi.getMembers(selectedOuId.value, {
      skipCount: (pager.page - 1) * pager.pageSize,
      maxResultCount: pager.pageSize,
      filter: memberFilter.value.trim() || undefined,
    })
    memberRows.value = data.items ?? []
    pager.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载成员失败')
  } finally {
    memberLoading.value = false
  }
}

function handleSelectOu(keys: Array<string | number>) {
  const key = keys[0]
  if (!key) return
  selectedOuId.value = String(key)

  const ou = findOuById(treeData.value, selectedOuId.value)
  selectedOuName.value = ou?.displayName ?? ''

  pager.page = 1
  checkedMemberRowKeys.value = []
  loadMembers()
}

function onQuery() {
  pager.page = 1
  loadMembers()
}

function onReset() {
  memberFilter.value = ''
  pager.page = 1
  loadMembers()
}

function onMemberPageChange(page: number) {
  pager.page = page
  loadMembers()
}

function onMemberPageSizeChange(size: number) {
  pager.pageSize = size
  pager.page = 1
  loadMembers()
}

function getMemberRowKey(row: MemberRow) {
  return row.id
}

function handleMemberCheckedRowKeys(keys: Array<string | number>) {
  checkedMemberRowKeys.value = keys.map((key) => String(key))
}

function openAddMember() {
  if (!selectedOuId.value) {
    message.warning('请先选择部门')
    return
  }

  checkedAddUserKeys.value = []
  userPager.page = 1
  userFilter.value = ''
  addMemberVisible.value = true
  loadAllUsers()
}

async function loadAllUsers() {
  const params: GetIdentityUsersParams = {
    skipCount: (userPager.page - 1) * userPager.pageSize,
    maxResultCount: userPager.pageSize,
    filter: userFilter.value.trim() || undefined,
  }

  try {
    const data = await usersApi.getList(params)
    allUserRows.value = data.items ?? []
    userPager.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载用户列表失败')
  }
}

function getUserRowKey(row: IdentityUserDto) {
  return row.id
}

function handleAddUserCheckedRowKeys(keys: Array<string | number>) {
  checkedAddUserKeys.value = keys.map((key) => String(key))
}

async function confirmAddMembers() {
  if (!selectedOuId.value) {
    message.warning('请先选择部门')
    return
  }

  if (checkedAddUserKeys.value.length === 0) {
    message.warning('请先勾选用户')
    return
  }

  addMemberLoading.value = true
  try {
    await Promise.all(
      checkedAddUserKeys.value.map((userId) => organizationUnitsApi.addUser(selectedOuId.value, userId)),
    )
    message.success('添加成员成功')
    addMemberVisible.value = false
    await loadMembers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '添加成员失败')
  } finally {
    addMemberLoading.value = false
  }
}

async function removeMembers() {
  if (!selectedOuId.value) {
    message.warning('请先选择部门')
    return
  }

  if (checkedMemberRowKeys.value.length === 0) {
    message.warning('请先选择要移除的成员')
    return
  }

  dialog.warning({
    title: '确认移除',
    content: `确认移除选中的 ${checkedMemberRowKeys.value.length} 名成员吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await Promise.all(
          checkedMemberRowKeys.value.map((userId) => organizationUnitsApi.removeUser(selectedOuId.value, userId)),
        )
        checkedMemberRowKeys.value = []
        message.success('移除成员成功')
        await loadMembers()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '移除成员失败')
      }
    },
  })
}

function onUserPageChange(page: number) {
  userPager.page = page
  loadAllUsers()
}

function onUserPageSizeChange(size: number) {
  userPager.pageSize = size
  userPager.page = 1
  loadAllUsers()
}

onMounted(async () => {
  loadColumnSettings()
  await loadOuTree()
  await loadMembers()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            v-model:value="memberFilter"
            clearable
            placeholder="按用户名/姓名/邮箱搜索"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="memberLoading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" :disabled="!selectedOuId" @click="openAddMember">添加成员</n-button>
        <n-button :disabled="!checkedMemberRowKeys.length" @click="removeMembers">移除成员</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <span>当前部门：{{ selectedOuName || '未选择' }}</span>
        <TableColumnManager
          :show="showColumnConfig"
          :settings="columnSettings"
          @update:show="handleColumnConfigShowChange"
          @visible-change="handleColumnVisibleChange"
        />
      </div>
    </template>

    <template #data>
      <div class="split-layout">
        <div class="split-left">
          <n-tree
            block-line
            selectable
            default-expand-all
            :data="treeOptions"
            :loading="treeLoading"
            :selected-keys="selectedOuId ? [selectedOuId] : []"
            @update:selected-keys="handleSelectOu"
          >
            <template #empty>
              <n-empty description="暂无组织机构" size="small" />
            </template>
          </n-tree>
        </div>
        <div class="split-right">
          <n-data-table
            class="crud-table-flat"
            :loading="memberLoading"
            :columns="memberColumns"
            :data="memberRows"
            :bordered="false"
            :row-key="getMemberRowKey"
            :checked-row-keys="checkedMemberRowKeys"
            @update:checked-row-keys="handleMemberCheckedRowKeys"
          />
        </div>
      </div>
    </template>

    <template #pager-right>
      <n-pagination
        v-model:page="pager.page"
        v-model:page-size="pager.pageSize"
        :item-count="pager.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="onMemberPageChange"
        @update:page-size="onMemberPageSizeChange"
      />
    </template>
  </BaseCrudPage>

  <n-modal v-model:show="addMemberVisible" preset="card" title="添加成员" style="width: 860px">
    <n-form inline class="crud-search-form" style="margin-bottom: 8px;">
      <n-form-item>
        <n-input
          v-model:value="userFilter"
          clearable
          placeholder="按用户名/姓名/邮箱搜索"
          @keyup.enter="loadAllUsers"
        />
      </n-form-item>
      <n-form-item class="crud-page-spacer" />
      <n-form-item>
        <n-button type="primary" @click="loadAllUsers">查询</n-button>
      </n-form-item>
    </n-form>

    <n-data-table
      :columns="addUserColumns"
      :data="allUserRows"
      :bordered="false"
      :row-key="getUserRowKey"
      :checked-row-keys="checkedAddUserKeys"
      @update:checked-row-keys="handleAddUserCheckedRowKeys"
    />

    <div class="modal-pager-wrap">
      <n-pagination
        v-model:page="userPager.page"
        v-model:page-size="userPager.pageSize"
        :item-count="userPager.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="onUserPageChange"
        @update:page-size="onUserPageSizeChange"
      />
    </div>

    <template #footer>
      <div class="modal-actions">
        <n-button @click="addMemberVisible = false">取消</n-button>
        <n-button type="primary" :loading="addMemberLoading" @click="confirmAddMembers">确认添加</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.split-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 12px;
  min-height: 420px;
}

.split-left,
.split-right {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 8px;
  overflow: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-pager-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
