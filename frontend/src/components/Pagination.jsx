export default function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="pagination">
      <span>Showing {from}-{to} of {meta.total}</span>
      <div className="buttons">
        <button type="button" className="btn btn-small" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
        <button type="button" className="btn btn-small" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
      </div>
    </div>
  );
}
