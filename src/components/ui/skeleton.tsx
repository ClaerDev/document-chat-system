import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular' | 'avatar' | 'button' | 'line' | 'image'
  animation?: boolean | 'pulse' | 'wave' | 'shimmer' | 'progressive'
  delay?: number
}

function Skeleton({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'shimmer',
  delay = 0,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded-sm h-4',
    line: 'rounded-sm h-3',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    avatar: 'rounded-full w-10 h-10',
    button: 'rounded-md h-9 w-20',
    image: 'rounded-lg aspect-video'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted',
    shimmer: 'relative overflow-hidden bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    progressive: 'animate-pulse opacity-0 animate-fade-in'
  }

  const combinedStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    animationDelay: delay ? `${delay}ms` : undefined,
    ...style
  }

  const animationClass = animation === true 
    ? animationClasses.shimmer 
    : animation === false 
    ? '' 
    : animationClasses[animation] || animationClasses.shimmer

  return (
    <div
      className={cn(
        "bg-muted",
        variantClasses[variant],
        animationClass,
        className
      )}
      style={combinedStyle}
      {...props}
    />
  )
}

export { Skeleton }