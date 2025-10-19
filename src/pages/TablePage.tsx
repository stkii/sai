import { useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';

import DataTable from '../components/DataTable';
import TableBar from '../components/TableBar';
import { type ParsedTable } from '../dto';
import '../globals.css';

const TablePage: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<ParsedTable | null>(null);

  return (
    <main className="table-view-container">
      <h1>データビューア（開発中）</h1>

      <TableBar
        onTableLoaded={(t) => {
          setError(null);
          setTable(t);
        }}
        onError={(msg) => {
          if (msg) setTable(null);
          setError(msg);
        }}
        className="mb-4"
      />

      <section className="flex justify-center">
        {error && <p className="error">読み込みに失敗しました: {error}</p>}
        {table && <DataTable data={table} />}
      </section>
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<TablePage />);
