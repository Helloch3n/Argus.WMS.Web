<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { NCard, NEmpty, NLayout, NLayoutContent, NLayoutSider } from 'naive-ui'

import WarehouseTree from './components/WarehouseTree.vue'
const LocationTable = defineAsyncComponent(() => import('./components/LocationTable.vue'))

type ZoneSelectPayload = { id: string; name: string; warehouseId?: string; warehouseCode?: string; warehouseName?: string }

const currentZoneId = ref<string | null>(null)
const currentZoneName = ref<string>('')
const currentWarehouseId = ref<string | undefined>(undefined)
const currentWarehouseCode = ref<string | undefined>(undefined)
const currentWarehouseName = ref<string | undefined>(undefined)

function handleZoneSelect(payload: ZoneSelectPayload) {
  currentZoneId.value = payload.id
  currentZoneName.value = payload.name
  currentWarehouseId.value = payload.warehouseId ?? undefined
  currentWarehouseCode.value = payload.warehouseCode ?? undefined
  currentWarehouseName.value = payload.warehouseName ?? undefined
}
</script>

<template>
  <n-card class="warehouse-page" :bordered="false">
    <n-layout class="warehouse-container" has-sider>
      <n-layout-sider width="280" class="aside" bordered>
        <WarehouseTree @zone-select="handleZoneSelect" />
      </n-layout-sider>
      <div class="divider" />
      <n-layout-content class="main-content">
        <LocationTable
          v-if="currentZoneId"
          :zone-id="currentZoneId"
          :zone-name="currentZoneName"
          :warehouse-id="currentWarehouseId"
          :warehouse-code="currentWarehouseCode"
          :warehouse-name="currentWarehouseName"
        />
        <div v-else class="empty-wrap">
          <n-empty description="请从左侧选择一个库区" />
        </div>
      </n-layout-content>
    </n-layout>
  </n-card>
</template>

<style scoped>
.warehouse-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.warehouse-container {
  height: 100%;
}

.aside {
  background: #ffffff;
  overflow: auto;
}

.main-content {
  background: #ffffff;
  overflow: auto;
  padding: 16px;
}

.divider {
  width: 1px;
  background: #f1f5f9;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>