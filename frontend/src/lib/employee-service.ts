import { api } from './api'
import type {
  EmployeeRow, JobRow, JobDetailRow, JobRecordRow, SkillRow,
} from '../types/provider'

export const employeeService = {
  me: () => api<EmployeeRow>('/employee/me'),
  updateMe: (body: { name?: string; phone?: string }) =>
    api<EmployeeRow>('/employee/me', 'PATCH', body),

  listSkills: () => api<SkillRow[]>('/employee/me/skills'),
  addSkill: (skill_name: string) =>
    api<SkillRow>('/employee/me/skills', 'POST', { skill_name }),
  removeSkill: (id: number) =>
    api<void>(`/employee/me/skills/${id}`, 'DELETE'),

  listMyJobs: (params?: { status?: string; schedule_status?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.schedule_status) sp.set('schedule_status', params.schedule_status)
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return api<{ items: JobRow[]; total: number; limit: number; offset: number }>(`/jobs${qs}`)
  },
  getJob: (id: number) => api<JobDetailRow>(`/jobs/${id}`),
  startJob: (id: number) => api<JobRow>(`/jobs/${id}/start`, 'POST'),
  completeJob: (id: number) => api<JobRow>(`/jobs/${id}/complete`, 'POST'),

  createRecord: (jobId: number, body: {
    record_type: 'STATUS' | 'NOTE' | 'MATERIAL'
    note?: string
    material_name?: string
    quantity?: number
    unit?: string
  }) => api<JobRecordRow>(`/jobs/${jobId}/records`, 'POST', body),
}