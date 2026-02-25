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

export interface ZoneDto {
  id?: string
  code: string
  name: string
  type: string
  remark?: string
}

export interface WarehouseDto {
  id?: string
  code: string
  name: string
  address: string
  manager: string
  mobile: string
  email: string
  remark?: string
  zones: ZoneDto[]
}

export interface CreateUpdateWarehouseDto {
  code: string
  name: string
  address: string
  manager: string
  mobile: string
  email: string
  remark?: string
}

export interface GetWarehouseListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  filter?: string
}

export interface WarehouseLocationDto {
  id?: string
  zoneId: string
  warehouseId?: string
  code: string
  aisle?: string
  rack?: string
  level?: string
  bin?: string
  maxWeight?: number
  maxVolume?: number
  maxReelCount?: number
  type?: number
  status?: number
  allowMixedProducts?: boolean
  allowMixedBatches?: boolean
}

export interface WarehouseZoneWithLocationsDto {
  id?: string
  code: string
  name: string
  locations?: WarehouseLocationDto[]
}

export interface WarehouseWithDetailsDto {
  id?: string
  code: string
  name: string
  address?: string
  manager?: string
  zones?: WarehouseZoneWithLocationsDto[]
}

const baseUrl = '/api/app/warehouse'

export async function getList(params: GetWarehouseListParams) {
  const res = await request.get<PagedResultDto<WarehouseDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<WarehouseDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateWarehouseDto) {
  const res = await request.post<WarehouseDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateWarehouseDto) {
  debugger
  const res = await request.put<WarehouseDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function getWithDetails(id: string) {
  const res = await request.get<WarehouseWithDetailsDto>(`${baseUrl}/${id}/with-details`)
  return res.data
}