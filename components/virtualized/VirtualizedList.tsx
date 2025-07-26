'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  containerHeight?: number
  gap?: number
  className?: string
}

export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 120,
  containerHeight = 600,
  gap = 8,
  className = ''
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    gap,
  })

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center text-slate-500">
          <div className="text-lg">No items found</div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{
        height: Math.min(containerHeight, items.length * (estimateSize + gap)),
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Specialized components for common use cases
interface VirtualizedSalesOrdersProps {
  orders: any[]
  onView: (order: any) => void
  onEdit: (order: any) => void
  onDelete: (order: any) => void
  onPDF: (order: any) => void
}

export function VirtualizedSalesOrders({
  orders,
  onView,
  onEdit,
  onDelete,
  onPDF
}: VirtualizedSalesOrdersProps) {
  return (
    <VirtualizedList
      items={orders}
      estimateSize={140}
      containerHeight={800}
      renderItem={(order) => (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-base text-slate-900">
                  {order.invoice_number}
                </span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {order.status || 'Draft'}
                </span>
                {order.tracking_number && (
                  <span className="text-xs text-slate-500">
                    📦 {order.tracking_number}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600 mb-1">
                <span className="font-medium">{order.companies?.company_name}</span>
                {order.customer_po_number && (
                  <span className="ml-2">• PO: {order.customer_po_number}</span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Date: {order.sales_date || 'N/A'}</span>
                <span>Total: <b>{order.currency || 'USD'} {order.total_net?.toFixed(2) || '0.00'}</b></span>
                <span>From: {order.my_companies?.my_company_name}</span>
              </div>
            </div>
            <div className="flex gap-1 ml-4">
              <button 
                onClick={() => onView(order)}
                className="p-2 hover:bg-slate-100 rounded"
                title="View"
              >
                👁️
              </button>
              <button 
                onClick={() => onEdit(order)}
                className="p-2 hover:bg-slate-100 rounded"
                title="Edit"
              >
                ✏️
              </button>
              <button 
                onClick={() => onPDF(order)}
                className="p-2 hover:bg-slate-100 rounded"
                title="PDF"
              >
                📄
              </button>
              <button 
                onClick={() => onDelete(order)}
                className="p-2 hover:bg-red-50 text-red-600 rounded"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    />
  )
}