import request from '@/utils/request'

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface WarehouseDto {
  id: string
  code: string
  name: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface CreateUpdateWarehouseDto {
  code: string
  name: string
}

export interface WarehousePagedQueryDto extends PagedAndSortedResultRequestDto {
  filter?: string
  warehouseCode?: string
  warehouseName?: string
}

export interface WarehouseLocationDto {
  id?: string
  code: string
}

export interface WarehouseZoneWithLocationsDto {
  id?: string
  code: string
  name?: string
  locations?: WarehouseLocationDto[]
}

export interface WarehouseWithDetailsDto extends WarehouseDto {
  zones?: WarehouseZoneWithLocationsDto[]
}

// 兼容旧命名
export type GetWarehouseListParams = WarehousePagedQueryDto

const baseUrl = '/api/app/warehouse'

export async function getList(params?: WarehousePagedQueryDto) {
  const res = await request.get<PagedResultDto<WarehouseDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<WarehouseDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getWithDetails(id: string) {
  const res = await request.get<WarehouseWithDetailsDto>(`${baseUrl}/${id}/with-details`)
  return res.data
}

export async function create(data: CreateUpdateWarehouseDto) {
  const res = await request.post<WarehouseDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateWarehouseDto) {
  const res = await request.put<WarehouseDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}