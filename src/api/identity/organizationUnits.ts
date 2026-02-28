import request from '@/utils/request'
import type {
  GetOrganizationUnitMembersParams,
  IdentityUserDto,
  ListResultDto,
  OrganizationUnitCreateDto,
  OrganizationUnitDto,
  OrganizationUnitUpdateDto,
  PagedResultDto,
} from './types'

const baseUrl = '/api/identity/organization-units'

export async function getTree() {
  const res = await request.get<ListResultDto<OrganizationUnitDto>>(`${baseUrl}/all`)
  return res.data
}

export async function get(id: string) {
  const res = await request.get<OrganizationUnitDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: OrganizationUnitCreateDto) {
  const res = await request.post<OrganizationUnitDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: OrganizationUnitUpdateDto) {
  const res = await request.put<OrganizationUnitDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function getMembers(id: string, params: GetOrganizationUnitMembersParams) {
  const res = await request.get<PagedResultDto<IdentityUserDto>>(`${baseUrl}/${id}/members`, { params })
  return res.data
}

export async function addUser(organizationUnitId: string, userId: string) {
  const res = await request.put<void>(`${baseUrl}/${organizationUnitId}/members/${userId}`)
  return res.data
}

export async function removeUser(organizationUnitId: string, userId: string) {
  const res = await request.delete<void>(`${baseUrl}/${organizationUnitId}/members/${userId}`)
  return res.data
}
