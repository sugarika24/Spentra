import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const Budgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    limit: '',
    period: 'monthly',
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/budgets/');
      setBudgets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to view budgets');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to fetch budgets');
      }
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.limit) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}/`, formData);
        toast.success('Budget updated successfully');
      } else {
        await api.post('/budgets/', formData);
        toast.success('Budget created successfully');
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData({ category: '', limit: '', period: 'monthly' });
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to manage budgets');
      } else {
        toast.error(error.response?.data?.detail || 'Operation failed');
      }
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit,
      period: budget.period,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.delete(`/budgets/${id}/`);
        toast.success('Budget deleted successfully');
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
        if (error.response?.status === 401) {
          toast.error('Please log in to delete budgets');
        } else {
          toast.error(error.response?.data?.detail || 'Failed to delete budget');
        }
      }
    }
  };

  const getProgressColor = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Budgets</h1>
        <button
          onClick={() => {
            setEditingBudget(null);
            setFormData({ category: '', limit: '', period: 'monthly' });
            setShowModal(true);
          }}
          className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          <PlusIcon className="h-5 w-5" />
          Add Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(budgets) && budgets.length > 0 ? (
          budgets.map((budget) => (
            <div
              key={budget.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {budget.category}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(budget)}
                    className="text-gray-500 hover:text-green-500 transition-colors"
                    disabled={loading}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                    disabled={loading}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Spent</span>
                  <span className="text-gray-800 font-medium">
                    ${Number(budget.spent || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Budget</span>
                  <span className="text-gray-800 font-medium">
                    ${Number(budget.limit || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className={`h-2.5 rounded-full ${getProgressColor(
                      Number(budget.spent || 0),
                      Number(budget.limit || 0)
                    )}`}
                    style={{
                      width: `${Math.min(
                        (Number(budget.spent || 0) / Number(budget.limit || 1)) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {Number(budget.spent || 0) >= Number(budget.limit || 0)
                  ? 'Budget exceeded!'
                  : `$${(
                      Number(budget.limit || 0) - Number(budget.spent || 0)
                    ).toFixed(2)} remaining`}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">No budgets found.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Limit
                </label>
                <input
                  type="number"
                  value={formData.limit}
                  onChange={(e) =>
                    setFormData({ ...formData, limit: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <select
                  value={formData.period}
                  onChange={(e) =>
                    setFormData({ ...formData, period: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingBudget ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets; 