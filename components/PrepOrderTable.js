export default function PrepOrderTable({ mainIngredients, seasonings }) {
  const items = [...(mainIngredients || []), ...(seasonings || [])].sort(
    (a, b) => (a.addOrder || 0) - (b.addOrder || 0)
  );

  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--board-text-dim)] mb-1">손질 &amp; 투입 순서</h3>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[280px]">
          <thead>
            <tr className="text-left border-b border-dashed border-[var(--board-border)]">
              <th className="py-1 pr-2 font-medium text-[var(--board-accent)]">순서</th>
              <th className="py-1 pr-2 font-medium text-[var(--board-accent)]">재료</th>
              <th className="py-1 pr-2 font-medium text-[var(--board-accent)]">손질(써는 모양)</th>
              <th className="py-1 font-medium text-[var(--board-accent)]">초벌</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-[var(--board-row-border)]">
                <td className="py-1 pr-2 text-[var(--board-text-dim)]">{item.addOrder}</td>
                <td className="py-1 pr-2 text-[var(--foreground)]">{item.name}</td>
                <td className="py-1 pr-2 text-[var(--board-text-dim)]">{item.prepMethod}</td>
                <td className="py-1 text-[var(--board-text-dim)]">{item.preSeared ? "✅" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
