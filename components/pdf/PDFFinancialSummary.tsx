interface FinancialSummaryProps {
  subtotal: number
  freight_charge?: number | null
  misc_charge?: number | null
  vat_percentage?: number | null
  vat_amount?: number | null
  total_net: number
  currency?: string | null
}

export default function PDFFinancialSummary({
  subtotal,
  freight_charge,
  misc_charge,
  vat_percentage,
  vat_amount,
  total_net,
  currency = 'USD'
}: FinancialSummaryProps) {
  return (
    <div className="flex justify-end mb-6">
      <div className="w-full max-w-xs sm:max-w-md md:w-80 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-sm">Sub Total:</td>
              <td className="py-1 text-sm text-right">${subtotal.toFixed(2)}</td>
            </tr>
            {misc_charge && misc_charge > 0 && (
              <tr>
                <td className="py-1 text-sm">Misc Charge:</td>
                <td className="py-1 text-sm text-right">${misc_charge.toFixed(2)}</td>
              </tr>
            )}
            {freight_charge && freight_charge > 0 && (
              <tr>
                <td className="py-1 text-sm">Freight/Forwarding:</td>
                <td className="py-1 text-sm text-right">${freight_charge.toFixed(2)}</td>
              </tr>
            )}
            {vat_amount && vat_amount > 0 && (
              <tr>
                <td className="py-1 text-sm">VAT ({vat_percentage || 0}%):</td>
                <td className="py-1 text-sm text-right">${vat_amount.toFixed(2)}</td>
              </tr>
            )}
            <tr className="border-t border-slate-300">
              <td className="py-2 font-bold">Total NET ({currency}):</td>
              <td className="py-2 font-bold text-right text-lg">${total_net.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}