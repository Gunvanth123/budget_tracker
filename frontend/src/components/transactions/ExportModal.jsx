import { useState } from 'react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { formatCurrency, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ExportModal({ isOpen, onClose, transactions }) {
  const [exportType, setExportType] = useState('all') // 'all' or 'month'
  const [selectedMonth, setSelectedMonth] = useState('')

  if (!isOpen) return null

  const handleExport = async () => {
    let exportData = transactions;
    if (exportType === 'month') {
      if (!selectedMonth) {
        toast.error('Please select a month')
        return
      }
      exportData = transactions.filter(txn => {
        // txn.date is like "2026-04-12T00:00:00.000Z"
        // selectedMonth is "2026-04"
        return txn.date.startsWith(selectedMonth)
      })

      if (exportData.length === 0) {
        toast.error('this month dont have data to fetch')
        return
      }
    } else {
      if (exportData.length === 0) {
        toast.error('No transactions to export')
        return
      }
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Transactions')

      // 1. Fetch and Add Logo
      try {
        const response = await fetch('/logo.png')
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const logoId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          })
          worksheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 160, height: 80 }
          })
          
          // Adjust row heights so the first 3 rows correspond to the area
          worksheet.getRow(1).height = 30
          worksheet.getRow(2).height = 30
          worksheet.getRow(3).height = 30
        }
      } catch (e) {
        console.error('Failed to load logo', e)
        // proceed without logo if failed
      }

      // 2. Set Row 4: Headers
      const headerRow = worksheet.getRow(4)
      headerRow.values = ['Type', 'Details', 'Category', 'Account', 'Date', 'Amount']
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00A19B' } // matches var(--primary)
        }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
      headerRow.height = 25

      // 3. Add Data Rows
      let currentRow = 5
      exportData.forEach(txn => {
        const row = worksheet.getRow(currentRow)
        row.values = [
          txn.type === 'income' ? 'Income' : 'Expense',
          txn.notes || txn.category?.name || '',
          txn.category?.name || '',
          txn.account?.name || '',
          new Date(txn.date),
          txn.amount
        ]
        
        row.getCell(5).numFmt = 'dd/mm/yyyy' // Format date
        row.getCell(6).numFmt = '#,##0.00' // Format amount as number
        
        // Add full row soft background
        const bgColor = txn.type === 'income' ? 'FFE6F9EE' : 'FFFDECEC'
        row.eachCell(function(cell) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          }
        })
        
        currentRow++
      })

      // Add AutoFilter
      worksheet.autoFilter = `A4:F${currentRow - 1}`

      // 4. Adjust Column Widths
      worksheet.columns = [
        { width: 12 }, // Type
        { width: 35 }, // Details
        { width: 18 }, // Category
        { width: 18 }, // Account
        { width: 15 }, // Date
        { width: 15 }, // Amount
      ]

      // 5. Save the file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `transactions_${exportType === 'month' ? selectedMonth : 'all'}.xlsx`)
      toast.success('Transactions exported successfully!')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate Excel file')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Export Data</h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="label">Export Options</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={() => setExportType('all')}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">All Data</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="month"
                  checked={exportType === 'month'}
                  onChange={() => setExportType('month')}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">By Month</span>
              </label>
            </div>
          </div>

          {exportType === 'month' && (
            <div>
              <label className="label">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="input cursor-text"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleExport} className="btn-primary flex-1">
            Download Excel
          </button>
        </div>
      </div>
    </div>
  )
}
