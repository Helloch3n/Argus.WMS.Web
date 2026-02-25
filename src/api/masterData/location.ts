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

export interface LocationDto {
  id?: string
  zoneId: string
  warehouseId: string
  code: string
  aisle: string
  rack: string
  level: string
  bin: string
  maxWeight: number
  maxVolume: number
  maxReelCount: number
  type: number
  status: number
  allowMixedProducts: boolean
  allowMixedBatches: boolean
}

export interface CreateUpdateLocationDto {
  zoneId: string
  warehouseId: string
  code: string
  aisle: string
  rack: string
  level: string
  bin: string
  maxWeight: number
  maxVolume: number
  maxReelCount: number
  type: number
  status: number
  allowMixedProducts: boolean
  allowMixedBatches: boolean
}

export interface BatchCreateLocationDto {
  zoneId: string
  aislePrefix: string
  rackCount: number
  levelCount: number
}

export interface GetLocationListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  filter?: string
  zoneId?: string
}

const baseUrl = '/api/app/location'

export async function getList(params: GetLocationListParams) {
  const res = await request.get<PagedResultDto<LocationDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<LocationDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateLocationDto) {
  debugger
  const res = await request.post<LocationDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateLocationDto) {
  const res = await request.put<LocationDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function deleteLocation(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
export { deleteLocation as delete }

export async function batchCreate(data: BatchCreateLocationDto) {
  const res = await request.post<void>(`${baseUrl}/batch-create`, data)
  return res.data
}