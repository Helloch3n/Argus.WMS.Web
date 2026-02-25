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
  zoneType: number
  remark?: string
  warehouseId: string
}

export interface CreateUpdateZoneDto {
  code: string
  name: string
  zoneType: number
  remark?: string
  warehouseId: string
}

export interface GetZoneListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  filter?: string
  warehouseId?: string
}

const baseUrl = '/api/app/zone'

export async function getList(params: GetZoneListParams) {
  const res = await request.get<PagedResultDto<ZoneDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<ZoneDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateZoneDto) {
  debugger
  const res = await request.post<ZoneDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateZoneDto) {
  const res = await request.put<ZoneDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function getByWarehouseId(warehouseId: string) {
  const res = await request.get<ZoneDto[]>(`${baseUrl}/by-warehouse/${warehouseId}`)
  return res.data
}