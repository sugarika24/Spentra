import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { ArrowUpRight, ArrowDownRight, CreditCard, Wallet, TrendingUp, DollarSign, X } from 'lucide-react';
import SampleBarChart from '../charts/SampleBarChart';
import SummaryCard from '../components/SummaryCard';
import { motion } from 'framer-motion';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import TransactionForm from './TransactionForm';
import { toast } from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend);

const palette = {
  light: '#D8F3DC',
  mid: '#95D5B2',
  dark: '#1B4332',
  accent: '#52B788',
};

const StatCard = ({ title, value, change, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100 flex flex-col justify-between h-full">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-green-700">{title}</p>
        <p className="mt-2 text-3xl font-bold text-green-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100' : 'bg-red-100'}`}> 
        <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
      </div>
    </div>
    <div className="mt-4 flex items-center">
      {trend === 'up' ? (
        <ArrowUpRight className="w-4 h-4 text-green-600" />
      ) : (
        <ArrowDownRight className="w-4 h-4 text-red-600" />
      )}
      <span className={`text-sm font-medium ml-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{change}</span>
    </div>
  </div>
);

const RecentTransaction = ({ description, amount, date, category }) => {
  const type = amount >= 0 ? 'income' : 'expense';
  return (
    <div className="flex items-center justify-between py-4 border-b border-green-50 last:border-0">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}> 
          {type === 'income' ? (
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-green-900">{description}</p>
          <p className="text-xs text-green-600">{date}</p>
        </div>
      </div>
      <p className={`text-sm font-bold ${type === 'income' ? 'text-green-700' : 'text-red-600'}`}>{type === 'income' ? '+' : '-'}${Math.abs(amount)}</p>
    </div>
  );
};

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions/');
      setTransactions(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Compute stats from transactions
  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Compute change (dummy for now)
  const stats = [
    {
      title: 'Total Balance',
      value: `$${balance.toLocaleString()}`,
      change: '',
      icon: Wallet,
      trend: balance >= 0 ? 'up' : 'down',
    },
    {
      title: 'Monthly Income',
      value: `$${income.toLocaleString()}`,
      change: '',
      icon: DollarSign,
      trend: 'up',
    },
    {
      title: 'Monthly Expenses',
      value: `$${expenses.toLocaleString()}`,
      change: '',
      icon: CreditCard,
      trend: 'down',
    },
    {
      title: 'Savings Rate',
      value: `${savingsRate.toFixed(0)}%`,
      change: '',
      icon: TrendingUp,
      trend: savingsRate >= 0 ? 'up' : 'down',
    },
  ];

  // Recent transactions (show last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Spending breakdown by category
  const spendingByCategory = {};
  transactions.forEach(t => {
    if (t.amount < 0) {
      const category = t.category || 'Uncategorized';
      spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(parseFloat(t.amount));
    }
  });

  const spendingBreakdownData = {
    labels: Object.keys(spendingByCategory),
    datasets: [{
      data: Object.values(spendingByCategory),
      backgroundColor: [
        '#43AA8B',
        '#90BE6D',
        '#F9C74F',
        '#F8961E',
        '#F3722C',
        '#F94144',
        '#277DA1',
        '#577590',
        '#4D908E',
        '#3A86FF'
      ],
      borderWidth: 1,
    }]
  };

  const spendingBreakdownOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Compute monthly expenses for the bar chart
  const monthlyExpenses = {};
  transactions.forEach(t => {
    if (t.amount < 0 && t.date) {
      const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + Math.abs(parseFloat(t.amount));
    }
  });
  const months = Object.keys(monthlyExpenses).sort((a, b) => {
    // Sort by date
    const [aMonth, aYear] = a.split(' ');
    const [bMonth, bYear] = b.split(' ');
    const aDate = new Date(`20${aYear}`, new Date(Date.parse(aMonth + ' 1, 2000')).getMonth());
    const bDate = new Date(`20${bYear}`, new Date(Date.parse(bMonth + ' 1, 2000')).getMonth());
    return aDate - bDate;
  });
  const monthlyExpenseData = months.map(m => monthlyExpenses[m]);

  const handleAddTransaction = () => {
    setModalOpen(true);
  };

  const handleFormSuccess = async () => {
    setModalOpen(false);
    await fetchTransactions(); // Refresh transactions after adding new one
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-green-900">Dashboard</h1>
          <button 
            onClick={handleAddTransaction}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto"
          >
            Add Transaction
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-green-100 p-6 flex flex-col h-full">
            <h2 className="text-lg font-bold text-green-900 mb-4">Monthly Expenses</h2>
            <div className="w-full h-64">
              <SampleBarChart labels={months} data={monthlyExpenseData} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-green-100 p-6 flex flex-col h-full">
            <h2 className="text-lg font-bold text-green-900 mb-4">Spending Breakdown</h2>
            <div className="w-full h-64">
              {Object.keys(spendingByCategory).length > 0 ? (
                <Pie data={spendingBreakdownData} options={spendingBreakdownOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No spending data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-lg border border-green-100">
          <div className="px-4 sm:px-6 py-4 border-b border-green-100">
            <h2 className="text-lg font-bold text-green-900">Recent Transactions</h2>
          </div>
          <div className="px-4 sm:px-6">
            {recentTransactions.map((transaction, index) => (
              <RecentTransaction key={index} {...transaction} />
            ))}
          </div>
          <div className="px-4 sm:px-6 py-4 border-t border-green-100">
            <button 
              onClick={() => navigate('/transactions')}
              className="text-sm font-semibold text-green-700 hover:text-green-900"
            >
              View all transactions →
            </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <TransactionForm
          onSuccess={handleFormSuccess}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </motion.div>
  );
};

export default Dashboard;
