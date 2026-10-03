"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, Upload, User } from 'lucide-react'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { isValid } from 'date-fns'
import format from '@/utils/date'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { deleteUser, updateUser, useSession } from '@/utils/auth-client'
import DeleteDialog from '@/components/delete-dialog'
import logger from '@/utils/logger'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import UserForm from '@/components/profile-form/user-form'


export default function ProfilePage() {

  const [password, setPassword] = useState('')
  const [deletingImage, setDeletingImage] = useState(false)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null)
  const router = useRouter()
  const { data, isPending } = useSession()
  const ref = useRef<HTMLInputElement>(null)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  useEffect(() => {
    if (isPending) return
    const input = ref.current
    if (!input) return
    const handleFileChange = () => {
      setPendingImage(input.files?.[0] ?? null)
    }
    input.addEventListener('change', handleFileChange)
    return () => {
      input.removeEventListener('change', handleFileChange)
    }
  }, [isPending, ref])

  useEffect(() => {
    if (pendingImage instanceof File) {
      const url = URL.createObjectURL(pendingImage)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [pendingImage])

  const clearPendingImage = () => {
    setPendingImage(null)
    if (ref.current) {
      ref.current.value = ''
    }
  }

  const handleRemoveImage = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    if (pendingImage) {
      clearPendingImage()
      return
    }
    if (deletingImage) return
    setDeletingImage(true)
    try {
      const { error } = await updateUser({ image: null })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Profile image removed')
      }
    } catch (error) {
      logger.error('Failed to remove profile image', error, 'Profile')
      toast.error('Failed to remove profile image')
    } finally {
      setDeletingImage(false)
    }
  }

  const handleClick = async () => {
    try {
      const res = await deleteUser({
        password,
      })
      if (res.error) toast(res.error.message)
      else {
        toast(res.data.message)
       void router.push('/auth/signin')
      }
    } catch (error) {
      logger.error('Failed to delete user account', error, 'Profile')
    }
  }

  return (
    <div>
      <Card className='bg-background border-none'>
        <CardHeader>
          <div
            onClick={() => {
              ref.current?.click()
            }}
            className="flex flex-col justify-center items-center"
          >
            {pendingImage && previewUrl ? (
              <Image
                className="size-40 rounded-full border cursor-pointer"
                src={previewUrl}
                width={100}
                height={100}
                alt="Profile preview"
              />
            ) : !isPending && data?.user.image ? (
              <Image
                className="size-40 rounded-full border cursor-pointer"
                src={data.user.image}
                width={100}
                height={100}
                alt="Profile preview"
              />
            ) : (
              <span>
                <User
                  className="mb-6 rounded-full border cursor-pointer"
                  size={200}
                />
              </span>
            )}
            <div className="relative">
              <Upload
                className="absolute bottom-8 -left-12 text-transparent hover:text-accent-foreground/60 cursor-pointer"
                size={100}
              />
            </div>
            {pendingImage || (!isPending && data?.user.image) ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="my-2"
                disabled={deletingImage}
                onClick={handleRemoveImage}
              >
                {deletingImage ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Remove Image
              </Button>
            ) : null}
            {imageUploadProgress !== null ? (
              <div className="flex w-full max-w-64 flex-col gap-1">
                <span className="text-sm">
                  Uploading image… {imageUploadProgress}%
                </span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${imageUploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            <CardTitle className="my-2">
              {isPending ? (
                <Skeleton className="w-40 h-5 bg-gray-200" />
              ) : (
                data?.user.name
              )}
            </CardTitle>
            <CardDescription>
              Updated at:{' '}
              {isPending ? (
                <Skeleton className="w-20 h-5 bg-gray-200" />
              ) : isValid(data?.user.createdAt) ? (
                format(data?.user.updatedAt as Date, 'PPp')
              ) : (
                ''
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UserForm
            data={data}
            isPending={isPending}
            ref={ref}
            selectedFile={pendingImage}
            onImageUploadProgress={setImageUploadProgress}
            onImageUploaded={clearPendingImage}
          />
        </CardContent>
        <CardFooter>
          <DeleteDialog
            title="To delete your Account, Please Inter your Password"
            deleteButtonLabel="Delete Account"
            onClick={void handleClick}
          >
            <div>
              <Label htmlFor="deleteAccountPassword">Password</Label>
              <Input
                onChange={handleChange}
                className="mt-1 border-none"
                placeholder="Password"
                type="password"
              />
            </div>
          </DeleteDialog>
        </CardFooter>
      </Card>
    </div>
  )
}