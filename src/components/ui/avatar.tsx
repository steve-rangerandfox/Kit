import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (src) {
    return <img src={src} alt={name || ''} className={cn('rounded-full object-cover', sizes[size], className)} />
  }

  return (
    <div className={cn('rounded-full bg-indigo-600 flex items-center justify-center font-medium text-white', sizes[size], className)}>
      {initials}
    </div>
  )
}
