import { useForm } from '@tanstack/react-form'
import z from 'zod'
import { toast } from 'react-toastify'

import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { UserFormSkeleton } from '../user-form-skeleton'
import UserFormField from './user-formField'
import type { StripEmptyObjects } from 'better-auth'
import { useEffect, type RefObject } from 'react'
import type { AnyFormOptions } from '@tanstack/react-form'
import { changeEmail, changePassword, updateUser } from '@/utils/auth-client'
import api from '@/utils/axios'
import logger from '@/utils/logger'

type UserInputs = z.infer<typeof userInputSchema>

const userInputSchema = z.object({
  name: z.string().trim().min(2).max(30).exactOptional(),
  email: z.email().exactOptional(),
  image: z
    .file()
    .mime(['image/jpeg', 'image/png', 'image/webp'])
    .max(5 * 1024 * 1024)
    .exactOptional(),
  currentPassword: z.string().min(8).max(40).exactOptional(),
  newPassword: z.string().min(8).max(40).exactOptional(),
  conformPassword: z.string().max(40).exactOptional(),
})

const parseData = ({ ...value }: UserInputs): string | undefined => {
  try {
    userInputSchema.parse({ ...value })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issue = err.issues[0]
      if (!issue) return undefined
      return `${String(issue.path[0])}, ${issue.message}`
    }
  }
}

type Data = {
  user: StripEmptyObjects<{
    id: string
    createdAt: Date
    updatedAt: Date
    email: string
    emailVerified: boolean
    name: string
    image?: string | null | undefined
  }>
  session: StripEmptyObjects<{
    id: string
    createdAt: Date
    updatedAt: Date
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string | null | undefined
    userAgent?: string | null | undefined
  }>
} | null

export default function UserForm({
  ref,
  data,
  isPending,
  selectedFile,
  onImageUploadProgress,
  onImageUploaded,
}: {
  ref: RefObject<HTMLInputElement | null>
  data: Data
  isPending: boolean
  selectedFile?: File | null
  onImageUploadProgress?: (progress: number | null) => void
  onImageUploaded?: () => void
}) {

  const formOptions: AnyFormOptions = {
    defaultValues: {
      name: data?.user.name ?? '',
      email: data?.user.email ?? '',
      image: null,
      currentPassword: '',
      newPassword: '',
      conformPassword: '',
    },
    onSubmit: async ({ value, formApi }) => {
      const val = value as UserInputs

      try {
        if (val.name !== data?.user.name) {
          const { error } = await updateUser({ name: val.name })
          if (error?.message) {
            toast.error(error.message)
            return
          }
          toast.success('Your name updated')
        }
        if (val.email !== data?.user.email) {
          const { error } = await changeEmail({ newEmail: val.email as string })
          if (error?.message) {
            toast(error.message)
            return
          }
          toast.success('Your Email updated')
        }

        if (val.newPassword && val.newPassword !== val.conformPassword) {
          toast.error("The passwords don't match")
          return
        }
        if (val.currentPassword && val.newPassword!.length === 0) {
          toast.error('Please inter new password')
          return
        }
        if (val.newPassword && val.currentPassword) {
          const res = await changePassword({
            currentPassword: val.currentPassword,
            newPassword: val.newPassword,
          })
          if (res.error) {
            toast.error(res.error.message)
            return
          }
          // send success message
          toast.success('Your Password updated')
        }
        if (val.image) {
          try {
            onImageUploadProgress?.(0)
            const formData = new FormData()
            formData.append('image', val.image)
            formData.append('type', 'avatars')
            const {
              data: { url },
        } = await api.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
              onUploadProgress: (e) => {
                if (e.total) {
                  onImageUploadProgress?.(
                    Math.round((e.loaded / e.total) * 100),
                  )
                }
              },
            })
            const { error } = await updateUser({ image: url })
            if (error?.message) {
              toast.error('Failed to upload image.')
              return
            }
            onImageUploaded?.()
            toast.success('Your Profile image updated')
          } catch (error) {
            toast.error('Failed to upload image.')
          } finally {
            onImageUploadProgress?.(null)
          }
        }
        formApi.reset()
      } catch (error) {
        logger.error('Profile form submission failed', error, 'Profile')
      }
    },
  }
  const form = useForm({ ...formOptions })

  useEffect(() => {
    form.setFieldValue('image', selectedFile ?? null)
  }, [form, selectedFile])

  if (isPending) {
    return <UserFormSkeleton />
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) =>
              value !== data?.user.name && parseData({ name: value }),
          }}
          name="name"
          children={(field) => (
            <UserFormField label="Name" placeholder="fullname" field={field} />
          )}
        />
      </div>
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) =>
              value !== data?.user.email && parseData({ email: value }),
          }}
          name="email"
          children={(field) => (
            <UserFormField
              label="Email"
              placeholder="email@email.com"
              field={field}
            />
          )}
        />
      </div>
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) =>
              value.length && parseData({ currentPassword: value }),
          }}
          name="currentPassword"
          children={(field) => (
            <UserFormField
              type="password"
              label="Current Password"
              placeholder="Current Password"
              field={field}
            />
          )}
        />
      </div>
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) =>
              value.length && parseData({ newPassword: value }),
          }}
          name="newPassword"
          children={(field) => (
            <UserFormField
              type="password"
              label="New Password"
              placeholder="New Password"
              field={field}
            />
          )}
        />
      </div>
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) =>
              value.length && parseData({ conformPassword: value }),
          }}
          name="conformPassword"
          children={(field) => (
            <UserFormField
              type="password"
              label="Conform Password"
              placeholder="Conform Password"
              field={field}
            />
          )}
        />
      </div>
      <div>
        <form.Field
          validators={{
            onChange: ({ value }) => value && parseData({ image: value }),
          }}
          name="image"
          children={(field) => (
            <UserFormField
              ref={ref}
              className="hidden"
              label=""
              type="file"
              field={field}
            />
          )}
        />
      </div>
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
            <Button
              variant="secondary"
              type="reset"
              onClick={(e) => {
                // Avoid unexpected resets of form elements (especially <select> elements)
                e.preventDefault()
                form.reset()
              }}
            >
              Reset
            </Button>
          </>
        )}
      />
    </form>
  )
}
