'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, X, Search, MapPin, Building, Hash, Code } from 'lucide-react'

interface SearchHelpProps {
  className?: string
}

export function SearchHelp({ className }: SearchHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const searchExamples = [
    {
      category: "Location Search",
      icon: <MapPin className="w-4 h-4" />,
      examples: [
        { query: "Washington DC", description: "Find opportunities in Washington DC" },
        { query: "California", description: "Find opportunities in California" },
        { query: "20001", description: "Search by zip code" },
        { query: "San Francisco", description: "Search by city name" }
      ]
    },
    {
      category: "Agency & Organization",
      icon: <Building className="w-4 h-4" />,
      examples: [
        { query: "GSA", description: "General Services Administration" },
        { query: "Department of Defense", description: "Search by full agency name" },
        { query: "DOD", description: "Search by agency code" }
      ]
    },
    {
      category: "Industry Codes",
      icon: <Code className="w-4 h-4" />,
      examples: [
        { query: "541511", description: "Custom Computer Programming (NAICS)" },
        { query: "541330", description: "Engineering Services (NAICS)" },
        { query: "D316", description: "Information Technology (PSC code)" }
      ]
    },
    {
      category: "Keywords & Services",
      icon: <Search className="w-4 h-4" />,
      examples: [
        { query: "software development", description: "Multi-word searches" },
        { query: "cybersecurity", description: "Service type searches" },
        { query: "cloud services", description: "Technology keywords" }
      ]
    },
    {
      category: "Solicitation Numbers",
      icon: <Hash className="w-4 h-4" />,
      examples: [
        { query: "DOD-25-R-0023", description: "Full solicitation number" },
        { query: "GSA-2024", description: "Partial solicitation search" }
      ]
    }
  ]

  const searchTips = [
    "Use multiple words to narrow results (e.g., 'software California')",
    "Search terms are case-insensitive",
    "Partial matches work for most fields",
    "NAICS codes can be searched with or without dashes",
    "State names and abbreviations both work (CA, California)"
  ]

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Search Help
      </Button>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Search Help & Examples</CardTitle>
            <CardDescription>
              Learn how to search effectively across all opportunity fields
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Search Examples by Category */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {searchExamples.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                {category.icon}
                {category.category}
              </div>
              <div className="space-y-2">
                {category.examples.map((example, exampleIndex) => (
                  <div key={exampleIndex} className="space-y-1">
                    <Badge 
                      variant="outline" 
                      className="font-mono text-xs cursor-pointer hover:bg-muted"
                      onClick={() => {
                        // This could trigger a search with the example query
                        navigator.clipboard.writeText(example.query)
                      }}
                    >
                      {example.query}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Search Tips */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-3">Search Tips</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {searchTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Searchable Fields */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-3">Searchable Fields</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Title', 'Description', 'Agency', 'City', 'State', 'Zip Code', 
              'NAICS Codes', 'PSC Codes', 'Solicitation Number', 'Set-Aside Type'
            ].map((field) => (
              <Badge key={field} variant="secondary" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}