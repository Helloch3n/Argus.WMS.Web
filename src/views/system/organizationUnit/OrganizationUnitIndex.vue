<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NTree,
  useMessage,
} from 'naive-ui'
import type { TreeOption } from 'naive-ui'

import BaseCrudPage from '@/components/BaseCrudPage.vue'
import { organizationUnitsApi, type OrganizationUnitCreateDto, type OrganizationUnitDto } from '@/api/identity'

const message = useMessage()

const loading = ref(false)
const treeData = ref<OrganizationUnitDto[]>([])
const treeFilter = ref('')
const selectedOuId = ref('')

const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const form = reactive<OrganizationUnitCreateDto>({
  parentId: null,
  displayName: '',
})

const selectedOu = computed(() => findOuById(treeData.value, selectedOuId.value))
const selectedOuName = computed(() => selectedOu.value?.displayName || '未选择')

const treeOptions = computed<TreeOption[]>(() => toTreeOptions(filteredTree.value))

const filteredTree = computed(() => {
  const keyword = treeFilter.value.trim().toLowerCase()
  if (!keyword) return treeData.value
  return filterTree(treeData.value, keyword)
})

function toTreeOptions(list: OrganizationUnitDto[]): TreeOption[] {
  return list.map((item) => ({
    key: item.id,
    label: item.displayName,
    children: item.children?.length ? toTreeOptions(item.children) : undefined,
  }))
}

function filterTree(list: OrganizationUnitDto[], keyword: string): OrganizationUnitDto[] {
  const result: OrganizationUnitDto[] = []

  for (const item of list) {
    const children = item.children?.length ? filterTree(item.children, keyword) : []
    const selfMatch = item.displayName.toLowerCase().includes(keyword)
    if (selfMatch || children.length > 0) {
      result.push({
        ...item,
        children,
      })
    }
  }

  return result
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

async function loadTree() {
  loading.value = true
  try {
    const data = await organizationUnitsApi.getTree()
    treeData.value = data.items ?? []

    if (!selectedOuId.value && treeData.value.length > 0) {
      selectedOuId.value = treeData.value[0]?.id ?? ''
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载组织机构失败')
  } finally {
    loading.value = false
  }
}

function handleSelect(keys: Array<string | number>) {
  selectedOuId.value = keys[0] ? String(keys[0]) : ''
}

function onQuery() {
}

function onReset() {
  treeFilter.value = ''
}

function openCreateRoot() {
  formMode.value = 'create'
  editingId.value = ''
  form.parentId = null
  form.displayName = ''
  formVisible.value = true
}

function openCreateChild() {
  if (!selectedOuId.value) {
    message.warning('请先选择父级部门')
    return
  }
  formMode.value = 'create'
  editingId.value = ''
  form.parentId = selectedOuId.value
  form.displayName = ''
  formVisible.value = true
}

function openEdit() {
  if (!selectedOu.value) {
    message.warning('请先选择要编辑的部门')
    return
  }
  formMode.value = 'edit'
  editingId.value = selectedOu.value.id
  form.parentId = selectedOu.value.parentId ?? null
  form.displayName = selectedOu.value.displayName
  formVisible.value = true
}

async function handleDelete() {
  if (!selectedOu.value) {
    message.warning('请先选择要删除的部门')
    return
  }

  try {
    await organizationUnitsApi.remove(selectedOu.value.id)
    message.success('删除成功')
    selectedOuId.value = ''
    await loadTree()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function submitForm() {
  const displayName = form.displayName.trim()
  if (!displayName) {
    message.warning('请输入部门名称')
    return
  }

  try {
    if (formMode.value === 'create') {
      await organizationUnitsApi.create({
        parentId: form.parentId,
        displayName,
      })
      message.success('新增成功')
    } else {
      await organizationUnitsApi.update(editingId.value, { displayName })
      message.success('更新成功')
    }

    formVisible.value = false
    await loadTree()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  }
}

onMounted(() => {
  loadTree()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            v-model:value="treeFilter"
            clearable
            placeholder="请输入部门名称"
            @keyup.enter="onQuery"
          />
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
        <n-button type="primary" @click="openCreateRoot">新增</n-button>
        <n-button :disabled="!selectedOuId" @click="openCreateChild">新增子部门</n-button>
        <n-button :disabled="!selectedOuId" @click="openEdit">编辑</n-button>
        <n-button type="error" :disabled="!selectedOuId" @click="handleDelete">删除</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <span>当前选择：{{ selectedOuName }}</span>
      </div>
    </template>

    <template #data>
      <n-tree
        block-line
        selectable
        default-expand-all
        :data="treeOptions"
        :loading="loading"
        :selected-keys="selectedOuId ? [selectedOuId] : []"
        @update:selected-keys="handleSelect"
      />
    </template>
  </BaseCrudPage>

  <n-modal v-model:show="formVisible" preset="card" :title="formMode === 'create' ? '新增部门' : '编辑部门'" style="width: 460px">
    <n-form label-width="90">
      <n-form-item label="部门名称" required>
        <n-input v-model:value="form.displayName" maxlength="64" show-count />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="formVisible = false">取消</n-button>
        <n-button type="primary" @click="submitForm">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
