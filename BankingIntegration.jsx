import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { toast } from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const BankingIntegration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [availableBanks, setAvailableBanks] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchConnectedBanks();
    fetchAvailableBanks();
  }, []);

  const fetchConnectedBanks = async () => {
    try {
      const response = await api.get('/banking/connected/');
      setConnectedBanks(response.data);
    } catch (error) {
      toast.error('Failed to fetch connected banks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBanks = async () => {
    try {
      const response = await api.get('/banking/available/');
      setAvailableBanks(response.data);
    } catch (error) {
      toast.error('Failed to fetch available banks');
    }
  };

  const connectBank = async (bankId) => {
    try {
      const response = await api.post(`/banking/connect/${bankId}/`);
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Failed to initiate bank connection');
    }
  };

  const disconnectBank = async (bankId) => {
    if (window.confirm('Are you sure you want to disconnect this bank?')) {
      try {
        await api.delete(`/banking/disconnect/${bankId}/`);
        toast.success('Bank disconnected successfully');
        fetchConnectedBanks();
      } catch (error) {
        toast.error('Failed to disconnect bank');
      }
    }
  };

  const syncTransactions = async (bankId) => {
    setSyncing(true);
    try {
      await api.post(`/banking/sync/${bankId}/`);
      toast.success('Transactions synced successfully');
    } catch (error) {
      toast.error('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Banking Integration
        </h1>
        <p className="text-gray-600 mt-2">
          Connect your bank accounts to automatically import transactions and keep
          your financial data up to date.
        </p>
      </div>

      {/* Connected Banks */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Connected Banks
        </h2>
        {connectedBanks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-600">No banks connected yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedBanks.map((bank) => (
              <div
                key={bank.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={bank.logo_url}
                      alt={bank.name}
                      className="h-8 w-8 object-contain"
                    />
                    <div>
                      <h3 className="font-medium text-gray-800">{bank.name}</h3>
                      <p className="text-sm text-gray-500">
                        Last synced: {new Date(bank.last_synced).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => syncTransactions(bank.id)}
                      disabled={syncing}
                      className="text-green-500 hover:text-green-600 disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`h-5 w-5 ${
                          syncing ? 'animate-spin' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => disconnectBank(bank.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span>Connected</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Banks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Available Banks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableBanks.map((bank) => (
            <div
              key={bank.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={bank.logo_url}
                    alt={bank.name}
                    className="h-8 w-8 object-contain"
                  />
                  <h3 className="font-medium text-gray-800">{bank.name}</h3>
                </div>
                <button
                  onClick={() => connectBank(bank.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BankingIntegration; 