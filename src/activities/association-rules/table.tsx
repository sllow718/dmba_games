import type { Transaction } from "../../core/types";
import { Token } from "../../components/ui";

/**
 * Receipts as a 0/1 table: one row per transaction, one column per item, 1 = bought.
 * `from` is the receipt number of the first row. Columns for `lit` items are shaded, and rows that contain every `lit` item are marked.
 */
export function OneHot({ data, items, lit = [], compact, from = 1 }: { data: readonly Transaction[]; items: readonly string[]; lit?: readonly string[]; compact?: boolean; from?: number }) {
  return (
    <div className="onehot-wrap">
      <table className={"onehot" + (compact ? " compact" : "")}>
        <caption className="sr-only">Receipts as a 0/1 table: 1 means the item was bought</caption>
        <thead>
          <tr>
            <th scope="col">Receipt</th>
            {items.map((it) => (
              <th key={it} scope="col" className={lit.includes(it) ? "on" : undefined}>
                <Token item={it} /><span className="nm">{it}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => {
            const hit = lit.length > 0 && lit.every((it) => t.includes(it));
            return (
              <tr key={i} className={hit ? "hit" : undefined}>
                <th scope="row">#{i + from}</th>
                {items.map((it) => {
                  const one = t.includes(it);
                  return <td key={it} className={(one ? "one" : "zero") + (lit.includes(it) ? " on" : "")}>{one ? 1 : 0}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
