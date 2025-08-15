interface FinancialSummaryCompactProps {
  subtotal: number
  freight_charge?: number | null
  misc_charge?: number | null
  vat_percentage?: number | null
  vat_amount?: number | null
  total_net: number
  currency?: string | null
}

export default function PDFFinancialSummaryCompact({
  subtotal,
  freight_charge,
  misc_charge,
  vat_percentage,
  vat_amount,
  total_net,
  currency = 'USD'
}: FinancialSummaryCompactProps) {
  return (
    <div className="flex justify-end mb-4 compact-spacing">
      <div className="w-full max-w-xs sm:max-w-md md:w-72 overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            <tr>
              <td className="py-0.5 text-xs">Sub Total:</td>
              <td className="py-0.5 text-xs text-right">${subtotal.toFixed(2)}</td>
            </tr>
            {misc_charge && misc_charge > 0 && (
              <tr>
                <td className="py-0.5 text-xs">Misc Charge:</td>
                <td className="py-0.5 text-xs text-right">${misc_charge.toFixed(2)}</td>
              </tr>
            )}
            {freight_charge && freight_charge > 0 && (
              <tr>
                <td className="py-0.5 text-xs">Freight/Forwarding:</td>
                <td className="py-0.5 text-xs text-right">${freight_charge.toFixed(2)}</td>
              </tr>
            )}
            {vat_amount && vat_amount > 0 && (
              <tr>
                <td className="py-0.5 text-xs">VAT ({vat_percentage || 0}%):</td>
                <td className="py-0.5 text-xs text-right">${vat_amount.toFixed(2)}</td>
              </tr>
            )}
            <tr className="border-t border-slate-300">
              <td className="py-1 font-bold text-xs">Total NET ({currency}):</td>
              <td className="py-1 font-bold text-right text-sm">${total_net.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}