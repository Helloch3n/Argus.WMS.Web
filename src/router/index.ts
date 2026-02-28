import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false } // 🔓 公开页面
    },

    {
      path: '/',
      component: () => import('@/layout/LayoutIndex.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardIndex.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'inventory',
          meta: { title: '库存管理' },
          children: [
            {
              path: 'inventory',
              name: 'InventoryList',
              component: () => import('@/views/inventory/InventoryIndex.vue'),
              meta: { title: '库存管理', requiresAuth: true },
            },
            {
              path: 'transactions',
              name: 'InventoryTransactionList',
              component: () => import('@/views/inventory/transaction/InventoryTransactionIndex.vue'),
              meta: { title: '库存流水', requiresAuth: true },
            },
          ],
        },
        {
          path: 'inbound',
          meta: { title: '入库管理' },
          children: [
            {
              path: 'receipt',
              name: 'ReceiptList',
              component: () => import('@/views/inbound/receipt/ReceiptIndex.vue'),
              meta: { title: '入库管理', requiresAuth: true },
            },
            {
              path: 'receipt/:id',
              name: 'ReceiptDetail',
              component: () => import('@/views/inbound/receipt/detail.vue'),
              meta: { title: '入库单详情', requiresAuth: true },
            },
          ]
        },
        {
          path: 'putaway',
          name: 'PutawayIndex',
          component: () => import('@/views/putaway/PutawayIndex.vue'),
          meta: { title: '上架管理', requiresAuth: true },
        },
        {
          path: 'master-data',
          meta: { title: '基础数据' },
          children: [
            {
              path: 'product',
              name: 'ProductList',
              component: () => import('@/views/masterData/product/ProductIndex.vue'),
              meta: { title: '物料管理', requiresAuth: true },
            },
            {
              path: 'supplier',
              name: 'SupplierList',
              component: () => import('@/views/masterData/supplier/SupplierIndex.vue'),
              meta: { title: '供应商管理', requiresAuth: true },
            },
            {
              path: 'warehouse',
              name: 'WarehouseList',
              component: () => import('@/views/masterData/warehouse/WarehouseIndex.vue'),
              meta: { title: '仓库管理', requiresAuth: true },
            },
            {
              path: 'zone',
              name: 'ZoneList',
              component: () => import('@/views/masterData/zone/ZoneIndex.vue'),
              meta: { title: '库区管理', requiresAuth: true },
            },
            {
              path: 'location',
              name: 'LocationList',
              component: () => import('@/views/masterData/location/LocationIndex.vue'),
              meta: { title: '库位管理', requiresAuth: true },
            },
            {
              path: 'reel',
              name: 'ReelList',
              component: () => import('@/views/masterData/reel/ReelIndex.vue'),
              meta: { title: '线盘管理', requiresAuth: true },
            },
          ],
        },
        {
          path: 'outbound',
          meta: { title: '出库管理' },
          children: [
            {
              path: 'outbound',
              name: 'OutboundList',
              component: () => import('@/views/outbound/OutboundIndex.vue'),
              meta: { title: '出库管理', requiresAuth: true },
            },
            {
              path: 'pick-task',
              name: 'PickTaskView',
              component: () => import('@/views/outbound/PickTaskView.vue'),
              meta: { title: '拣货执行', requiresAuth: true },
            },
          ]
        },
        {
          path: 'system',
          meta: { title: '系统管理' },
          children: [
            {
              path: 'role',
              name: 'RoleManagement',
              component: () => import('@/views/system/role/RoleIndex.vue'),
              meta: { title: '角色管理', requiresAuth: true },
            },
            {
              path: 'organization-unit',
              name: 'DepartmentManagement',
              component: () => import('@/views/system/organizationUnit/OrganizationUnitIndex.vue'),
              meta: { title: '部门管理', requiresAuth: true },
            },
            {
              path: 'organization-unit-user',
              name: 'DepartmentUserManagement',
              component: () => import('@/views/system/organizationUnitUser/OrganizationUnitUserIndex.vue'),
              meta: { title: '用户管理', requiresAuth: true },
            },
            {
              path: 'data-sync-task',
              name: 'DataSyncTaskList',
              component: () => import('@/views/system/dataSyncTask/DataSyncTaskIndex.vue'),
              meta: { title: '数据同步中心', requiresAuth: true },
            },
          ],
        },
      ],
    }
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta?.requiresAuth !== false
  if (requiresAuth && !authStore.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && authStore.token) {
    return { path: '/' }
  }

  // 自动添加标签页
  if (to.meta?.title && to.path !== '/login') {
    const tabsStore = useTabsStore()
    tabsStore.addTab({
      path: to.path,
      name: (to.name as string) ?? to.path,
      title: to.meta.title as string,
    })
  }

  return true
})

export default router
