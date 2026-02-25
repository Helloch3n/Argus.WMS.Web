import request from '@/utils/request'

/** ABP 常用分页结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** ABP 常用列表查询参数 */
export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface Inventory {
  id: string
  reelId: string
  productId: string
  productCode?: string
  quantity: number
  availableQuantity: number
  lockedQuantity: number
  unit: string
  weight: number
  batchNo: string
  sourceWo: string
  sn: string
  status: number | string
  craftVersion?: string | null
  fifoDate: string
  layerIndex: number
  reelNo: string
  locationCode: string
  productName: string
}

export interface ProductionReceiveInput {
  reelId: string
  productId: string
  quantity: number
  weight?: number
  batchNo?: string
  sourceWo?: string
  locationId?: string
}

export interface GetInventoryListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string  
  filter?: string
}

const baseUrl = '/api/app/inventory'

export async function getList(params: GetInventoryListParams) {
  const res = await request.get<PagedResultDto<Inventory>>(baseUrl, { params })
  return res.data
}

/**
 * 调用后端 InventoryManager 的 ProductionReceiveAsync
 * ABP 默认路由：/api/app/inventory/production-receive
 */
export async function productionReceive(data: ProductionReceiveInput) {
  const res = await request.post<void>(`${baseUrl}/production-receive`, data)
  return res.data
}