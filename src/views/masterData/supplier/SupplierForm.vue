<script lang="ts">
export default {
  name: 'SupplierForm',
}
</script>

<script setup lang="ts">
import { NFormItem, NGrid, NGridItem, NInput } from 'naive-ui'
import type { CreateUpdateSupplierDto } from '@/api/masterData/supplier'

// defineProps<{
//   modelValue: CreateUpdateSupplierDto
// }>()

// defineEmits<{
//   'update:modelValue': [value: CreateUpdateSupplierDto]
// }>()

const model = defineModel<CreateUpdateSupplierDto>({ required: true })
</script>

<template>
  <n-grid :cols="24" :x-gap="16" :y-gap="12">
    <n-grid-item :span="12">
      <n-form-item label="编号" path="code" required>
        <n-input v-model:value="model.code" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="名称" path="name" required>
        <n-input v-model:value="model.name" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="12">
      <n-form-item label="联系人" path="contactPerson" required>
        <n-input v-model:value="model.contactPerson" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="电话" path="mobile" required>
        <n-input v-model:value="model.mobile" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="12">
      <n-form-item label="邮箱" path="email" required>
        <n-input v-model:value="model.email" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="地址" path="address" required>
        <n-input v-model:value="model.address" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="24">
      <n-form-item label="详细地址">
        <n-input v-model:value="model.address" type="textarea" :rows="2" />
      </n-form-item>
    </n-grid-item>
  </n-grid>
</template>