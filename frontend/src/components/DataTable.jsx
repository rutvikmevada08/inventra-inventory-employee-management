// columns: [{ key, header, render?(row), align?: 'num' | 'actions' }]
export default function DataTable({ columns, rows, loading, emptyMessage = 'No records found.', rowKey = (r) => r._id }) {
  const empty = !loading && (!rows || rows.length === 0);
  return (
    <div className="table-wrap" aria-busy={loading}>
      <table className="table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.align === 'num' ? 'num' : undefined}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {(rows || []).map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.align}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {loading && !rows?.length && <div className="table-empty">Loading...</div>}
      {empty && <div className="table-empty">{emptyMessage}</div>}
    </div>
  );
}
