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

export interface ReelDto {
  id?: string
  reelNo: string
  name: string
  size?: string
  selfWeight: number
  currentLocationId?: string
  currentLocationCode?: string
  status: number | string
  isLocked: boolean
}

export interface CreateUpdateReelDto {
  reelNo?: string
  name: string
  size?: string
  selfWeight: number
  currentLocationId?: string
}

export interface UpdateReelLocationDto {
  locationId: string
}

export interface GetReelListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  filter?: string
  reelNo?: string
  reelCode?: string
}

const baseUrl = '/api/app/reel'

export async function getList(params: GetReelListParams) {
  const res = await request.get<PagedResultDto<ReelDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<ReelDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateReelDto) {
  const res = await request.post<ReelDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateReelDto) {
  const res = await request.put<ReelDto>(`${baseUrl}/${id}`, data)
  return res.data
}

async function deleteReel(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
export { deleteReel as delete }

export async function updateLocation(id: string, data: UpdateReelLocationDto) {
  const res = await request.put<void>(`${baseUrl}/${id}/update-location`, data)
  return res.data
}