import { httpClient } from './client'
import type { IntegrationStatus, IntegrationProvider } from '@/types'

export const integrationsService = {
  async list(): Promise<IntegrationStatus[]> {
    const { data } = await httpClient.get<IntegrationStatus[]>('/integrations')
    return data
  },

  async getOAuthUrl(provider: IntegrationProvider): Promise<string> {
    const { data } = await httpClient.get<{ url: string }>('/integrations/oauth/url', { params: { provider } })
    return data.url
  },

  async disconnect(provider: IntegrationProvider): Promise<void> {
    await httpClient.delete(`/integrations/${provider}`)
  },

  async startGmailWatch(): Promise<{ status: string; email_address: string; expires_at: string }> {
    const { data } = await httpClient.post('/gmail/watch')
    return data
  },
}
