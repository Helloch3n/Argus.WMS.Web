<script lang="ts">
export default {
  name: 'LocationBatchDialog',
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NModal, NTag, useMessage } from 'naive-ui'

import { batchCreate } from '@/api/masterData/location'

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const zoneId = ref('')
const message = useMessage()

const form = reactive({
  aislePrefix: 'A',
  rackCount: 1,
  levelCount: 1,
  status: 'Empty',
})

function open(id: string) {
  zoneId.value = id
  form.aislePrefix = 'A'
  form.rackCount = 1
  form.levelCount = 1
  visible.value = true
}

async function onSubmit() {
  const payload = {
    zoneId: zoneId.value,
    aislePrefix: form.aislePrefix,
    rackCount: form.rackCount,
    levelCount: form.levelCount,
  }
  await batchCreate(payload)
  message.success('批量生成成功')
  visible.value = false
  emit('success')
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="visible">
    <n-card title="批量生成库位" style="width: 520px" closable @close="visible = false">
      <n-form label-width="110">
        <n-form-item label="巷道前缀">
          <n-input v-model:value="form.aislePrefix" placeholder="生成如 A-01-01" />
        </n-form-item>
        <n-form-item label="货架数量">
          <n-input-number v-model:value="form.rackCount" :min="1" :max="100" />
        </n-form-item>
        <n-form-item label="层数">
          <n-input-number v-model:value="form.levelCount" :min="1" :max="20" />
        </n-form-item>
        <n-form-item label="初始状态">
          <n-tag type="success">空闲</n-tag>
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" @click="onSubmit">生成</n-button>
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