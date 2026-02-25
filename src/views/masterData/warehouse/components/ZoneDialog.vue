<script setup lang="ts">
import { reactive, ref } from 'vue'
import { NButton, NCard, NForm, NFormItem, NInput, NModal, NSelect, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

import { create as createZone, update as updateZone } from '@/api/masterData/zone'

type ZoneRow = {
    id?: string
    code?: string
    name?: string
    zoneType?: number
    warehouseId?: string
}

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const currentId = ref<string | null>(null)

const warehouseId = ref<string>('')
const warehouseName = ref<string>('')

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const form = reactive({
    code: '',
    name: '',
    zoneType: 0 as number | null,
})

const rules: FormRules = {
    code: [{ required: true, message: '请输入编码', trigger: ['input', 'blur'] }],
    name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
    zoneType: [{ required: true, type: 'number', message: '请选择类型', trigger: ['change', 'blur'] }],
}

function resetForm() {
    form.code = ''
    form.name = ''
    form.zoneType = 0
}

function open(wId: string, wName: string, row?: ZoneRow) {
    if (row?.id) {
        mode.value = 'edit'
        currentId.value = row.id
        form.code = row.code ?? ''
        form.name = row.name ?? ''
        form.zoneType = typeof row.zoneType === 'number' ? row.zoneType : 0
        warehouseId.value = row.warehouseId ?? wId
        warehouseName.value = wName ?? warehouseName.value
    } else {
        mode.value = 'create'
        currentId.value = null
        warehouseId.value = wId
        warehouseName.value = wName
        resetForm()
    }

    visible.value = true
}

async function onSubmit() {
    await formRef.value?.validate()

    const payload = {
        code: form.code,
        name: form.name,
        zoneType: form.zoneType ?? 0,
        warehouseId: warehouseId.value,
    }

    if (mode.value === 'edit' && currentId.value) {
        await updateZone(currentId.value, payload)
        message.success('更新成功')
    } else {
        await createZone(payload)
        message.success('创建成功')
    }

    visible.value = false
    emit('success')
}

defineExpose({ open })
</script>

<template>
    <n-modal v-model:show="visible">
        <n-card :title="mode === 'create' ? '新建库区' : '编辑库区'" style="width: 640px" closable
            @close="visible = false">
            <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
                <n-form-item label="所属仓库">
                    <n-input :value="warehouseName" readonly />
                </n-form-item>

                <n-form-item label="编码" path="code">
                    <n-input v-model:value="form.code" placeholder="建议格式: WH01-存储区01" />
                </n-form-item>

                <n-form-item label="名称" path="name">
                    <n-input v-model:value="form.name" />
                </n-form-item>

                <n-form-item label="类型" path="zoneType">
                    <n-select
                        v-model:value="form.zoneType"
                        placeholder="请选择"
                        :options="[
                            { value: 0, label: 'Storage(存储区)' },
                            { value: 1, label: 'Receiving(收货区)' },
                            { value: 2, label: 'Shipping(发货区)' },
                        ]"
                    />
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

<script lang="ts">
export default {
    name: 'ZoneDialog',
}
</script>

<style scoped>
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>