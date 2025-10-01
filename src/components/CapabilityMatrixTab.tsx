'use client'

import React, { useState } from 'react'
import { Target, Plus, Download, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Opportunity } from '@/types'

interface CapabilityMatrixTabProps {
  opportunity: Opportunity
}

interface TaskArea {
  id: string
  name: string
  description: string
  match: 'High' | 'Medium' | 'Low'
  relevance: string
}

export function CapabilityMatrixTab({ opportunity }: CapabilityMatrixTabProps) {
  const [hasMatrix, setHasMatrix] = useState(false)
  const [taskAreas, setTaskAreas] = useState<TaskArea[]>([])

  // NO MOCK DATA - Remove all dummy/mock data from detail page
  
  const handleCreateMatrix = () => {
    // No mock data - only generate real capability matrix when implemented
    console.log('Capability matrix generation not implemented - no mock data shown')
  }

  const handleDeleteMatrix = () => {
    setTaskAreas([])
    setHasMatrix(false)
  }

  const getMatchBadgeColor = (match: string) => {
    switch (match) {
      case 'High':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'Low':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (!hasMatrix) {
    return (
      <div className="space-y-6">
        {/* Empty State with Create Button */}
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-government/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-government" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Capability Matrix</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a comprehensive capability assessment matrix to analyze your organization's alignment with this opportunity's requirements.
            </p>
            <Button onClick={handleCreateMatrix} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Capability Matrix
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-government" />
            <div>
              <h3 className="text-lg font-semibold">Capability Matrix</h3>
              <p className="text-sm text-muted-foreground">
                Showing {taskAreas.length} of {taskAreas.length} results
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Task Areas
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-4 h-4" />
              Generate
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700" onClick={handleDeleteMatrix}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Capability Matrix Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Task Area Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-center">Match</TableHead>
              <TableHead className="w-32 text-center">Relevance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskAreas.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="text-sm font-medium">{task.id}</div>
                  <div className="text-xs text-muted-foreground mt-1">{task.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{task.description}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${getMatchBadgeColor(task.match)} border-0`}>
                    ● {task.match}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-800 p-0 h-auto">
                    {task.relevance}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Rows per page: 10 ⌄
        </div>
        <div className="flex items-center gap-4">
          <span>Page 1 of 2</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>
              ‹
            </Button>
            <Button variant="outline" size="sm">
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}