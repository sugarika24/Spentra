import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import TransactionForm from './TransactionForm';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

const categories = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transport', 'Other'
];

const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl p-0 relative w-full max-w-lg mx-2 animate-fade-in">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-green-100"><X className="w-5 h-5" /></button>
        {children}
      </div>
    </div>
  );
};

const TransactionDetailsModal = ({ open, transaction, onClose, onEdit, onDelete }) => {
  if (!open || !transaction) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-green-900 mb-4">Transaction Details</h2>
        <div className="space-y-2 mb-6">
          <div><span className="font-semibold text-green-800">Date:</span> {transaction.date}</div>
          <div><span className="font-semibold text-green-800">Description:</span> {transaction.description}</div>
          <div><span className="font-semibold text-green-800">Amount:</span> <span className={transaction.amount >= 0 ? 'text-green-700' : 'text-red-600'}>{transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount)}</span></div>
          <div><span className="font-semibold text-green-800">Category:</span> {transaction.category}</div>
          {transaction.created_at && <div><span className="font-semibold text-green-800">Created At:</span> {new Date(transaction.created_at).toLocaleString()}</div>}
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-md bg-green-100 text-green-800 hover:bg-green-200" onClick={() => onEdit(transaction)}><Pencil className="w-4 h-4 inline mr-1" /> Edit</button>
          <button className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700" onClick={() => onDelete(transaction)}><Trash2 className="w-4 h-4 inline mr-1" /> Delete</button>
        </div>
      </div>
    </Modal>
  );
};

const TransactionRow = ({ transaction, onEdit, onDelete, onView }) => (
  <tr className="border-b border-green-50 hover:bg-green-50 transition cursor-pointer" onClick={() => onView(transaction)}>
    <td className="py-2 px-3 text-green-900">{transaction.date}</td>
    <td className="py-2 px-3 text-green-900">{transaction.description}</td>
    <td className={`py-2 px-3 font-semibold ${transaction.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>{transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount)}</td>
    <td className="py-2 px-3 text-green-700">{transaction.category}</td>
    <td className="py-2 px-3 flex gap-2" onClick={e => e.stopPropagation()}>
      <button onClick={() => onEdit(transaction)} className="p-2 rounded hover:bg-green-100"><Pencil className="w-4 h-4" /></button>
      <button onClick={() => onDelete(transaction)} className="p-2 rounded hover:bg-red-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
    </td>
  </tr>
);

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [deleteTransaction, setDeleteTransaction] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [detailsTransaction, setDetailsTransaction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions/');
      setTransactions(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    setEditTransaction(transaction);
    setModalOpen(true);
    setDetailsOpen(false);
  };

  const handleAdd = () => {
    setEditTransaction(null);
    setModalOpen(true);
  };

  const handleDelete = (transaction) => {
    setDeleteTransaction(transaction);
    setConfirmDeleteOpen(true);
    setDetailsOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTransaction) return;
    try {
      await api.delete(`/transactions/${deleteTransaction.id}/`);
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete transaction');
    }
    setConfirmDeleteOpen(false);
    setDeleteTransaction(null);
    fetchTransactions();
  };

  const handleFormSuccess = (msg) => {
    setModalOpen(false);
    setEditTransaction(null);
    fetchTransactions();
    toast.success(msg || (editTransaction ? 'Transaction updated' : 'Transaction added'));
  };

  const handleView = (transaction) => {
    setDetailsTransaction(transaction);
    setDetailsOpen(true);
  };

  const filtered = transactions.filter(t =>
    (!search || t.description.toLowerCase().includes(search.toLowerCase())) &&
    (!category || t.category === category) &&
    (!type || (type === 'income' ? t.amount >= 0 : t.amount < 0))
  );

  // CSV Export
  const handleExportCSV = () => {
    const csv = Papa.unparse(filtered.map(({ id, ...t }) => t));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const imported = results.data.filter(row => row.date && row.description && row.amount && row.category);
        let successCount = 0;
        let errorCount = 0;
        for (const row of imported) {
          try {
            await api.post('/transactions/', row);
            successCount++;
          } catch {
            errorCount++;
          }
        }
        if (successCount > 0) toast.success(`${successCount} transactions imported!`);
        if (errorCount > 0) toast.error(`${errorCount} failed to import.`);
        fetchTransactions();
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-green-900">Transactions</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
            onClick={handleAdd}
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 border border-green-300"
            onClick={handleExportCSV}
          >
            Export CSV
          </button>
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 border border-green-300 cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl shadow-lg border border-green-100 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-green-50 text-green-900">
              <th className="py-2 px-3 text-left">Date</th>
              <th className="py-2 px-3 text-left">Description</th>
              <th className="py-2 px-3 text-left">Amount</th>
              <th className="py-2 px-3 text-left">Category</th>
              <th className="py-2 px-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-green-600">No transactions found.</td></tr>
            ) : (
              filtered.map(t => (
                <TransactionRow key={t.id} transaction={t} onEdit={handleEdit} onDelete={handleDelete} onView={handleView} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTransaction(null); }}>
        <TransactionForm
          initialData={editTransaction}
          onSuccess={handleFormSuccess}
          onCancel={() => { setModalOpen(false); setEditTransaction(null); }}
        />
      </Modal>

      {/* Details Modal */}
      <TransactionDetailsModal
        open={detailsOpen}
        transaction={detailsTransaction}
        onClose={() => setDetailsOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Delete Confirmation Modal */}
      <Modal open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold text-red-700 mb-4">Delete Transaction</h2>
          <p className="mb-6">Are you sure you want to delete this transaction?</p>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded-md bg-gray-100 text-green-800 hover:bg-gray-200"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transactions; 