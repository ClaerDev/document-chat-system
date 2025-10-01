'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SearchHighlightProps {
  text: string
  searchQuery: string
  className?: string
  highlightClassName?: string
}

/**
 * Highlights matching text within a string based on search query
 * Supports multiple word searches and partial matches
 */
export function SearchHighlight({ 
  text, 
  searchQuery, 
  className,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-900/50 font-semibold"
}: SearchHighlightProps) {
  if (!searchQuery || !text) {
    return <span className={className}>{text}</span>
  }

  // Split search query into individual words for multi-word search
  const searchTerms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0)

  if (searchTerms.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Create a regex pattern that matches any of the search terms
  const pattern = searchTerms
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex characters
    .join('|')
  
  const regex = new RegExp(`(${pattern})`, 'gi')
  
  // Split the text by the regex pattern
  const parts = text.split(regex)
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part matches any search term
        const isMatch = searchTerms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        )
        
        if (isMatch) {
          return (
            <mark
              key={index}
              className={cn(
                "px-0.5 rounded-sm",
                highlightClassName
              )}
            >
              {part}
            </mark>
          )
        }
        
        return <React.Fragment key={index}>{part}</React.Fragment>
      })}
    </span>
  )
}

/**
 * Utility function to check if text contains search query
 */
export function containsSearchQuery(text: string, searchQuery: string): boolean {
  if (!searchQuery || !text) return false
  
  const searchTerms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0)
  
  const lowerText = text.toLowerCase()
  
  // Check if any search term is found in the text
  return searchTerms.some(term => lowerText.includes(term))
}

/**
 * Get match score for relevance ranking
 */
export function getSearchRelevance(text: string, searchQuery: string): number {
  if (!searchQuery || !text) return 0
  
  const searchTerms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0)
  
  const lowerText = text.toLowerCase()
  let score = 0
  
  searchTerms.forEach(term => {
    // Exact match gets highest score
    if (lowerText === term) {
      score += 100
    }
    // Starts with term
    else if (lowerText.startsWith(term)) {
      score += 50
    }
    // Contains complete word
    else if (new RegExp(`\\b${term}\\b`).test(lowerText)) {
      score += 25
    }
    // Contains partial match
    else if (lowerText.includes(term)) {
      score += 10
    }
  })
  
  return score
}

/**
 * Hook for search highlighting and filtering
 */
export function useSearchHighlight<T extends Record<string, any>>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): {
  filteredItems: T[]
  highlightText: (text: string) => JSX.Element
} {
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items
    
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return containsSearchQuery(value, searchQuery)
        }
        return false
      })
    }).sort((a, b) => {
      // Sort by relevance
      const aScore = searchFields.reduce((acc, field) => {
        const value = a[field]
        if (typeof value === 'string') {
          return acc + getSearchRelevance(value, searchQuery)
        }
        return acc
      }, 0)
      
      const bScore = searchFields.reduce((acc, field) => {
        const value = b[field]
        if (typeof value === 'string') {
          return acc + getSearchRelevance(value, searchQuery)
        }
        return acc
      }, 0)
      
      return bScore - aScore // Higher score first
    })
  }, [items, searchQuery, searchFields])
  
  const highlightText = React.useCallback((text: string) => {
    return <SearchHighlight text={text} searchQuery={searchQuery} />
  }, [searchQuery])
  
  return {
    filteredItems,
    highlightText
  }
}