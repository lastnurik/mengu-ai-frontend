import { httpClient } from './client'
import type { Draft, DraftListItem, DraftApproveResponse } from '@/types'

interface DraftsListResponse { data: DraftListItem[]; total: number; page: number; per_page: number }

export const draftsService = {
  async getAll(params: { status?: string; page?: number; per_page?: number } = {}): Promise<DraftsListResponse> {
    const { data } = await httpClient.get<DraftsListResponse>('/drafts', { params })
    return data
  },

  async getById(id: string): Promise<Draft> {
    const { data } = await httpClient.get<Draft>(`/drafts/${id}`)
    return data
  },

  async approve(id: string): Promise<DraftApproveResponse> {
    const { data } = await httpClient.patch<DraftApproveResponse>(`/drafts/${id}/approve`)
    return data
  },

  async update(id: string, patch: { recipient?: string; subject?: string; body?: string }): Promise<Draft> {
    const { data } = await httpClient.patch<Draft>(`/drafts/${id}`, patch)
    return data
  },
}
