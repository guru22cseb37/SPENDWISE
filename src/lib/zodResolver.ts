import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { ZodTypeAny } from 'zod'

/** Small Zod adapter for React Hook Form, kept local so the app needs no extra resolver package. */
export function zodResolver<T extends FieldValues>(schema: ZodTypeAny): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values)
    if (result.success) return { values: result.data as T, errors: {} }

    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of result.error.issues) {
      const field = issue.path.join('.')
      if (field && !errors[field]) errors[field] = { type: issue.code, message: issue.message }
    }
    return { values: {}, errors: errors as FieldErrors<T> }
  }
}
