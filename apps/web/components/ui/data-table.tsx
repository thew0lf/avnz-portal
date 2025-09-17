"use client"
import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { GripVertical, MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

function DragHandle({ id }: { id: UniqueIdentifier }){
  const { attributes, listeners } = useSortable({ id })
  return (
    <button className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground" aria-label="Drag row" {...attributes} {...listeners}>
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )
}

function DraggableRow<TData>({ row }: { row: any }){
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.id })
  return (
    <TableRow
      ref={setNodeRef}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative"
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  )
}

export type CommonColumn<TData> = ColumnDef<TData, any>

export function DataTable<TData>({
  data: initial,
  columns,
  enableDnD = false,
  onReorder,
  rowsPerPageOptions = [10, 20, 30, 40, 50],
}: {
  data: TData[]
  columns: CommonColumn<TData>[]
  enableDnD?: boolean
  onReorder?: (rows: TData[]) => void
  rowsPerPageOptions?: number[]
}){
  const [data, setData] = React.useState(() => initial)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pageSize, setPageSize] = React.useState(rowsPerPageOptions[0] || 10)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor))
  const rowIds = React.useMemo<UniqueIdentifier[]>(() => table.getRowModel().rows.map(r => r.id), [table.getRowModel().rows])

  function onDragEnd(e: any){
    if (!enableDnD) return
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = rowIds.indexOf(active.id)
    const newIndex = rowIds.indexOf(over.id)
    const newData = arrayMove(data, oldIndex, newIndex)
    setData(newData)
    onReorder?.(newData)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row: any) => (
                  enableDnD ? <DraggableRow key={row.id} row={row} /> : (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell: any) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Rows per page</label>
          <select className="h-8 rounded border px-2 text-sm" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            {rowsPerPageOptions.map(n => (<option key={n} value={n}>{n}</option>))}
          </select>
          <Button variant="outline" className="hidden h-8 w-8 p-0 md:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="hidden h-8 w-8 p-0 md:flex" onClick={() => table.setPageIndex(table.getPageCount()-1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  )
}

// Helpers for common columns
export function makeSelectionColumn<TData>() : ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center"><Checkbox checked={table.getIsAllPageRowsSelected()} onChange={e => table.toggleAllPageRowsSelected(!!(e.target as HTMLInputElement).checked)} /></div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center"><Checkbox checked={row.getIsSelected()} onChange={e => row.toggleSelected(!!(e.target as HTMLInputElement).checked)} /></div>
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

export function makeDragColumn<TData>() : ColumnDef<TData> {
  return {
    id: 'drag',
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.id} />,
    enableSorting: false,
    enableHiding: false,
  }
}

export function makeActionsColumn<TData>({ onEdit, onDelete, viewHref }: { onEdit?: (row: TData)=>void; onDelete?: (row: TData)=>void; viewHref?: (row: TData)=>string; }) : ColumnDef<TData> {
  return {
    id: 'actions',
    header: () => null,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {viewHref && (<DropdownMenuItem asChild><a href={viewHref(row.original as TData)}>View</a></DropdownMenuItem>)}
          {onEdit && (<DropdownMenuItem onClick={() => onEdit(row.original as TData)}>Edit</DropdownMenuItem>)}
          {onDelete && (<DropdownMenuItem onClick={() => onDelete(row.original as TData)}>Delete</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }
}

