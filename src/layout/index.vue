<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NButton,
  NDropdown,
} from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tabsStore = useTabsStore()

const username = computed(() => authStore.user?.username ?? 'User')
const isCollapsed = ref(false)
const refreshKey = ref(0)
const viewKey = computed(() => `${route.fullPath}-${refreshKey.value}`)

const menuOptions: MenuOption[] = [
  {
    label: '基础数据',
    key: 'master-data',
    children: [
      { label: '物料管理', key: '/master-data/product' },
      { label: '供应商管理', key: '/master-data/supplier' },
      { label: '仓库管理', key: '/master-data/warehouse' },
      { label: '线盘管理', key: '/master-data/reel' },
    ],
  },
  {
    label: '库存管理',
    key: 'inventory',
    children: [
      { label: '库存查询', key: '/inventory/inventory' },
      { label: '库存流水', key: '/inventory/transactions' },
    ],
  },
  {
    label: '入库管理',
    key: 'inbound',
    children: [
      { label: '入库单据', key: '/inbound/receipt' },
    ],
  },
  {
    label: '上架管理',
    key: 'putaway',
    children: [
      { label: '上架作业', key: '/putaway' },
    ],
  },
  {
    label: '出库管理',
    key: 'outbound',
    children: [
      { label: '出库作业', key: '/outbound/outbound' },
      { label: '拣货执行 (PDA)', key: '/outbound/pick-task' },
    ],
  },
  {
    label: '系统管理',
    key: 'system',
    children: [
      { label: '数据同步中心', key: '/system/data-sync-task' },
    ],
  },
]

async function onLogout() {
  tabsStore.closeAll()
  authStore.logout()
  await router.push('/login')
}

function onMenuUpdate(key: string) {
  if (key.startsWith('/')) {
    router.push(key)
  }
}

function handleTabClick(path: string) {
  tabsStore.setActive(path)
  router.push(path)
}

function handleTabClose(path: string) {
  tabsStore.removeTab(path)
  if (route.path === path) {
    router.push(tabsStore.activeTab || '/dashboard')
  }
}

const cachedViews = computed(() =>
  tabsStore.tabList.map((t) => t.name).filter(Boolean),
)

// ---- 右键菜单 ----
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTab = ref('')

const contextMenuOptions = [
  { label: '关闭当前', key: 'close-current' },
  { label: '关闭其他', key: 'close-others' },
  { label: '关闭所有', key: 'close-all' },
  { label: '刷新当前', key: 'refresh-current' },
]

function handleTabContextMenu(e: MouseEvent, path: string) {
  e.preventDefault()
  contextMenuTab.value = path
  showContextMenu.value = false
  nextTick(() => {
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    showContextMenu.value = true
  })
}

function handleContextMenuSelect(key: string) {
  showContextMenu.value = false
  const path = contextMenuTab.value
  if (key === 'close-current') {
    handleTabClose(path)
  } else if (key === 'close-others') {
    tabsStore.closeOthers(path)
    router.push(path)
  } else if (key === 'close-all') {
    tabsStore.closeAll()
    router.push('/dashboard')
  } else if (key === 'refresh-current') {
    refreshKey.value = Date.now()
  }
}

function handleContextMenuClickOutside() {
  showContextMenu.value = false
}

function toggleSider() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <n-layout class="layout" has-sider>
    <!-- ========== 侧边栏 ========== -->
    <n-layout-sider
      width="230"
      :collapsed-width="72"
      :collapsed="isCollapsed"
      collapse-mode="width"
      class="sidebar"
      :class="{ collapsed: isCollapsed }"
      bordered
    >
      <div class="logo-wrap">
        <div class="logo-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <span class="logo-text" :class="{ hidden: isCollapsed }">Argus WMS</span>
      </div>

      <n-menu
        class="menu"
        :options="menuOptions"
        :collapsed="isCollapsed"
        :value="route.path"
        @update:value="onMenuUpdate"
      />

    </n-layout-sider>

    <n-layout>
      <!-- ========== 顶栏 ========== -->
      <n-layout-header class="header" bordered>
        <div class="header-left">
          <n-button class="collapse-btn" size="small" quaternary @click="toggleSider">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="10" y1="12" x2="20" y2="12" />
                <line x1="14" y1="18" x2="20" y2="18" />
              </svg>
            </template>
          </n-button>

          <div class="header-tabs">
            <div class="tabs-scroll">
              <div
                v-for="tab in tabsStore.tabList"
                :key="tab.path"
                class="tab-item"
                :class="{ active: tab.path === route.path }"
                @click="handleTabClick(tab.path)"
                @contextmenu="handleTabContextMenu($event, tab.path)"
              >
                <span class="tab-label">{{ tab.title }}</span>
                <span
                  v-if="tabsStore.tabList.length > 1"
                  class="tab-close"
                  @click.stop="handleTabClose(tab.path)"
                >
                  <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor">
                    <path d="M3.17 3.17a.5.5 0 0 1 .7 0L6 5.3l2.13-2.13a.5.5 0 0 1 .7.7L6.71 6l2.12 2.13a.5.5 0 0 1-.7.7L6 6.71 3.87 8.83a.5.5 0 0 1-.7-.7L5.3 6 3.17 3.87a.5.5 0 0 1 0-.7z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="header-right">
          <div class="user-badge">
            <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
            <span class="user-name">{{ username }}</span>
          </div>
          <n-button size="small" quaternary type="error" @click="onLogout">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </template>
            退出
          </n-button>
        </div>
      </n-layout-header>

      <n-dropdown
        placement="bottom-start"
        trigger="manual"
        :x="contextMenuX"
        :y="contextMenuY"
        :options="contextMenuOptions"
        :show="showContextMenu"
        @select="handleContextMenuSelect"
        @clickoutside="handleContextMenuClickOutside"
      />

      <!-- ========== 主内容 ========== -->
      <n-layout-content class="main">
        <router-view v-slot="{ Component }">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="viewKey" />
          </keep-alive>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
/* ============================
   全局布局
   ============================ */
.layout {
  min-height: 100vh;
  height: 100vh;
  background: #f5f7fb;
}

/* ============================
   侧边栏
   ============================ */
.sidebar {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 55%, #e2e8f0 100%);
  color: #0f172a;
  border-right: 1px solid rgba(15, 23, 42, 0.06) !important;
  box-shadow: 2px 0 12px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed .logo-wrap {
  justify-content: center;
  padding: 0;
}

.sidebar.collapsed .logo-text {
  display: none;
}

/* Logo 区域 */
.logo-wrap {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.logo-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: rgba(59, 130, 246, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.5px;
}

.logo-text.hidden {
  display: none;
}

/* 菜单区域 */
.menu {
  border-right: none;
  padding: 12px 8px;
  flex: 1;
  overflow-y: auto;
}

/* ============================
   顶栏
   ============================ */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: none !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 0 16px 0 0;
  height: 48px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.collapse-btn {
  margin-left: 6px;
}

.header-tabs {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tabs-scroll {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 10px;
}

.tabs-scroll::-webkit-scrollbar {
  display: none;
}

/* Tab 标签 */
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
}

.tab-item:hover {
  color: #334155;
  background: #f1f5f9;
}

.tab-item.active {
  color: #4f46e5;
  background: #eef2ff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.08);
}

.tab-label {
  line-height: 1;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: #94a3b8;
  transition: all 0.15s ease;
  margin-left: 2px;
}

.tab-close:hover {
  color: #ef4444;
  background: #fee2e2;
}

.tab-item.active .tab-close {
  color: #a5b4fc;
}

.tab-item.active .tab-close:hover {
  color: #ef4444;
  background: #fee2e2;
}

/* 用户区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

/* ============================
   主内容区
   ============================ */
.main {
  padding: 20px 24px;
  min-height: calc(100vh - 48px);
  overflow: auto;
  background: #f5f7fb;
}
</style>