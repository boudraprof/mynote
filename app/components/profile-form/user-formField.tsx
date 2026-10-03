import { FieldInfo } from '../field-info'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { AnyFieldApi } from '@tanstack/react-form'
import { cn } from '@/utils'

function UserFormField({
  field,
  label,
  ...props
}: {
  field: AnyFieldApi
  label: string
} & React.ComponentProps<'input'>) {
  const isValid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <>
      <Label
        className={cn('py-1', isValid && 'text-red-600')}
        htmlFor={field.name}
      >
        {label}
      </Label>
      <Input
        className={cn(isValid && 'border-red-600', 'bg-background!')}
        id={field.name}
        name={field.name}
        type={props.type || 'text'}
        value={props.type === 'file' ? undefined : field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => {
          if (props.type === 'file') {
            field.handleChange(e.target.files?.[0])
          } else {
            field.handleChange(e.target.value)
          }
        }}
        {...props}
      />
      <FieldInfo field={field} />
    </>
  )
}

export default UserFormField
