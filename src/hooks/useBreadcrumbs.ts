import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
}

interface BreadcrumbConfig {
  [key: string]: {
    label: string
    parent?: string
  }
}

const defaultConfig: BreadcrumbConfig = {
  '/': { label: 'Home' },
  '/dashboard': { label: 'Dashboard', parent: '/' },
  '/profile': { label: 'Company Profile', parent: '/dashboard' },
  '/opportunities': { label: 'Opportunities', parent: '/dashboard' },
  '/components-showcase': { label: 'Components', parent: '/dashboard' },
  '/billing': { label: 'Billing', parent: '/dashboard' },
}

export function useBreadcrumbs(
  customConfig?: BreadcrumbConfig,
  currentTab?: string
): BreadcrumbItem[] {
  const pathname = usePathname()
  
  return useMemo(() => {
    const config = { ...defaultConfig, ...customConfig }
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Build breadcrumb trail from current path
    let currentPath = pathname
    const pathSegments: string[] = []
    
    // Collect all parent paths
    while (currentPath && config[currentPath]) {
      pathSegments.unshift(currentPath)
      currentPath = config[currentPath].parent || ''
    }
    
    // Convert to breadcrumb items
    pathSegments.forEach((path, index) => {
      const isLast = index === pathSegments.length - 1
      breadcrumbs.push({
        id: path,
        label: config[path].label,
        href: isLast ? undefined : path
      })
    })
    
    // Add current tab as final breadcrumb if provided
    if (currentTab && breadcrumbs.length > 0) {
      const tabLabels: { [key: string]: string } = {
        'overview': 'Overview',
        'basic': 'Basic Information',
        'naics': 'NAICS Codes', 
        'certifications': 'Certifications',
        'capabilities': 'Core Capabilities',
        'settings': 'Account Settings'
      }
      
      if (tabLabels[currentTab]) {
        breadcrumbs.push({
          id: `${pathname}-${currentTab}`,
          label: tabLabels[currentTab]
        })
      }
    }
    
    return breadcrumbs
  }, [pathname, customConfig, currentTab])
}

export function useProfileBreadcrumbs(currentTab?: string): BreadcrumbItem[] {
  return useBreadcrumbs(undefined, currentTab)
}