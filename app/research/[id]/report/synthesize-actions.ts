'use server'

import { revalidatePath } from 'next/cache'
import { synthesizeStrategy, regenerateSection } from '@/lib/strategy/generator'
import type { StrategySectionType } from '@/lib/types'

const VALID_SECTION_TYPES: StrategySectionType[] = [
  'business',
  'market',
  'audience',
  'channels',
  'competitors',
]

export async function synthesizeStrategyAction(formData: FormData): Promise<void> {
  const artifactId = formData.get('artifactId') as string
  const jobId = formData.get('jobId') as string
  if (!artifactId) throw new Error('artifactId обязателен')

  await synthesizeStrategy(artifactId)
  revalidatePath(`/research/${jobId}/report`)
}

export async function regenerateSectionAction(formData: FormData): Promise<void> {
  const artifactId = formData.get('artifactId') as string
  const jobId = formData.get('jobId') as string
  const sectionType = formData.get('sectionType') as string
  if (!artifactId || !jobId || !sectionType) {
    throw new Error('artifactId, jobId, sectionType обязательны')
  }
  if (!VALID_SECTION_TYPES.includes(sectionType as StrategySectionType)) {
    throw new Error(`Неизвестный тип секции: ${sectionType}`)
  }

  await regenerateSection(artifactId, sectionType as StrategySectionType, jobId)
  revalidatePath(`/research/${jobId}/report`)
}
