<script lang="ts">
export default {
    name: 'WarehouseDialog',
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { NButton, NCard, NForm, NFormItem, NInput, NModal, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

import { create as createWarehouse, update as updateWarehouse } from '@/api/masterData/warehouse'

type WarehouseRow = {
    id?: string
    code?: string
    name?: string
    manager?: string
    address?: string
}

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const currentId = ref<string | null>(null)

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const form = reactive({
    code: '',
    name: '',
    manager: '',
    address: '',
})

const rules: FormRules = {
    code: [{ required: true, message: '请输入编号', trigger: ['input', 'blur'] }],
    name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
    manager: [{ required: true, message: '请输入负责人', trigger: ['input', 'blur'] }],
}

function resetForm() {
    form.code = ''
    form.name = ''
    form.manager = ''
    form.address = ''
}

function open(row?: WarehouseRow) {
    if (row?.id) {
        mode.value = 'edit'
        currentId.value = row.id
        form.code = row.code ?? ''
        form.name = row.name ?? ''
        form.manager = row.manager ?? ''
        form.address = row.address ?? ''
    } else {
        mode.value = 'create'
        currentId.value = null
        resetForm()
    }
    visible.value = true
}

async function onSubmit() {
    await formRef.value?.validate()

    const payload = {
        code: form.code,
        name: form.name,
        manager: form.manager,
        address: form.address,
        mobile: '',
        email: '',
        remark: '',
    }

    if (mode.value === 'edit' && currentId.value) {
        await updateWarehouse(currentId.value, payload)
        message.success('更新成功')
    } else {
        await createWarehouse(payload)
        message.success('创建成功')
    }

    visible.value = false
    emit('success')
}

defineExpose({ open })
</script>

<template>
    <n-modal v-model:show="visible">
        <n-card :title="mode === 'create' ? '新建仓库' : '编辑仓库'" style="width: 640px" closable
            @close="visible = false">
            <n-form ref="formRef" :model="form" :rules="rules" label-width="90">
                <n-form-item label="编号" path="code">
                    <n-input v-model:value="form.code" :disabled="mode === 'edit'" />
                </n-form-item>
                <n-form-item label="名称" path="name">
                    <n-input v-model:value="form.name" />
                </n-form-item>
                <n-form-item label="负责人" path="manager">
                    <n-input v-model:value="form.manager" />
                </n-form-item>
                <n-form-item label="地址">
                    <n-input v-model:value="form.address" type="textarea" :rows="2" />
                </n-form-item>
            </n-form>

            <template #footer>
                <div class="modal-actions">
                    <n-button @click="visible = false">取消</n-button>
                    <n-button type="primary" @click="onSubmit">保存</n-button>
                </div>
            </template>
        </n-card>
    </n-modal>
</template>

<style scoped>
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>