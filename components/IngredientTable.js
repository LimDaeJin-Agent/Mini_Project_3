export default function IngredientTable({ title, items, servingsLabel }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--board-text-dim)] mb-1">{title}</h3>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[280px]">
          <thead>
            <tr className="text-left border-b border-dashed border-[var(--board-border)]">
              <th className="py-1 pr-2 font-medium text-[var(--board-accent)]">재료</th>
              <th className="py-1 pr-2 font-medium text-[var(--board-accent)]">1인분</th>
              <th className="py-1 font-medium text-[var(--board-accent)]">{servingsLabel}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-[var(--board-row-border)]">
                <td className="py-1 pr-2 text-[var(--foreground)]">
                  {!item.owned && "🛒 "}
                  {item.name}
                </td>
                <td className="py-1 pr-2 text-[var(--board-text-dim)]">{item.amountPerServing}</td>
                <td className="py-1 text-[var(--foreground)]">{item.amountForRequestedServings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
