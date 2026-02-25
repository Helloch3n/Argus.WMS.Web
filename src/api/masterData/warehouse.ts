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
  id?: string
  code: string
  name: string
}

export interface CreateUpdateWarehouseDto {
  code: string
  name: string
}

export interface GetWarehouseListParams extends PagedAndSortedResultRequestDto {
  filter?: string
}

const baseUrl = '/api/app/warehouse'

export async function getList(params?: GetWarehouseListParams) {
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
  const res = await request.put<WarehouseDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}