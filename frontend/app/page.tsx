"use client";
import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import PositionAnalytics from './components/PositionAnalytics';
import PieChart from './components/PieChart';

interface Asset {
  id: number;
  name: string;
  isStock: boolean;
  ticker?: string;
  shares?: number;
  currentPrice?: number;
  balance?: number;
  apy?: number;
}

function InputField({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all"
      />
    </div>
  );
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([
    { id: 1, name: "Amazon", isStock: true, ticker: "AMZN", shares: 20, currentPrice: 1.50 },
    { id: 2, name: "Constellation Energy Corp", isStock: true, ticker: "CEG", shares: 0.057, currentPrice: 1.10 },
    { id: 3, name: "Firefly Aerospace Inc.", isStock: true, ticker: "FFIE", shares: 5.051, currentPrice: 1.05 },
    { id: 4, name: "Lululemon", isStock: true, ticker: "LULU", shares: 3.826, currentPrice: 20.33 },
    { id: 5, name: "Meta", isStock: true, ticker: "META", shares: 1.432, currentPrice: 1.12 },
    { id: 6, name: "Microsoft", isStock: true, ticker: "MSFT", shares: 1.951, currentPrice: 1.48 },
    { id: 7, name: "Vanguard S&P 500 ETF", isStock: true, ticker: "VOO", shares: 7.913, currentPrice: 1.22 },
    { id: 8, name: "Ally HYSA", isStock: false, balance: 1000.00, apy: 0.03 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    isStock: true,
    ticker: '',
    shares: '',
    currentPrice: '',
    balance: '',
    apy: ''
  });

  // Generate next ID
  const getNextId = () => {
    return Math.max(...assets.map(a => a.id), 0) + 1;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name) return;
    let assetData: Partial<Asset>;

    if (formData.isStock) {
      if (!formData.ticker || !formData.shares || !formData.currentPrice) return;
      assetData = {
        name: formData.name,
        isStock: true,
        ticker: formData.ticker.toUpperCase(),
        shares: parseFloat(formData.shares) || 0,
        currentPrice: parseFloat(formData.currentPrice) || 0
      };
    } else {
      if (!formData.balance || !formData.apy) return;
      assetData = {
        name: formData.name,
        isStock: false,
        balance: parseFloat(formData.balance) || 0,
        apy: parseFloat(formData.apy) || 0
      };
    }

    if (editingAsset) {
      // Update existing asset
      setAssets(prev => prev.map(asset => 
        asset.id === editingAsset.id 
          ? { ...asset, ...assetData }
          : asset
      ));
      setEditingAsset(null);
    } else {
      // Add new asset or combine with existing
      setAssets(prev => {
        const index = prev.findIndex(asset =>
          asset.isStock === assetData.isStock &&
          ((asset.isStock && asset.ticker === assetData.ticker) || (!asset.isStock && asset.name === assetData.name))
        );
        if (index !== -1) {
          const updated = [...prev];
          if (assetData.isStock) {
            const existingShares = updated[index].shares || 0;
            const existingPrice = updated[index].currentPrice || 0;
            const newShares = assetData.shares || 0;
            const newPrice = assetData.currentPrice || 0;
            
            // Calculate weighted average price
            const totalShares = existingShares + newShares;
            const weightedAveragePrice = totalShares > 0 
              ? ((existingShares * existingPrice) + (newShares * newPrice)) / totalShares
              : newPrice;
            
            updated[index].shares = totalShares;
            updated[index].currentPrice = weightedAveragePrice;
          } else {
            updated[index].balance = (updated[index].balance || 0) + (assetData.balance || 0);
            updated[index].apy = assetData.apy;
          }
          return updated;
        }
        return [...prev, { ...assetData, id: getNextId() } as Asset];
      });
    }

    setFormData({ name: '', isStock: true, ticker: '', shares: '', currentPrice: '', balance: '', apy: '' });
    setShowModal(false);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      isStock: asset.isStock,
      ticker: asset.ticker || '',
      shares: asset.shares?.toString() || '',
      currentPrice: asset.currentPrice?.toString() || '',
      balance: asset.balance?.toString() || '',
      apy: asset.apy?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = (assetId: number) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAsset(null);
    setFormData({ name: '', isStock: true, ticker: '', shares: '', currentPrice: '', balance: '', apy: '' });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 pt-8">
      <div className="w-full max-w-5xl">
        <div className="mt-8 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Portfolio Allocation</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-1 rounded-lg transition-colors ${
                  isEditMode 
                    ? 'bg-blue-100 text-blue-600 cursor-pointer' 
                    : 'text-gray-400 hover:text-gray-600 hover:scale-105 transition-all cursor-pointer'
                }`}
                title={isEditMode ? "Exit Edit Mode" : "Edit Portfolio"}
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setShowModal(true);
                }}
                disabled={isEditMode}
                className={`p-1 pr-2 rounded-lg transition-colors ${
                  isEditMode 
                    ? 'text-gray-200 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-gray-600 hover:scale-105 transition-all cursor-pointer'
                }`}
                title={isEditMode ? "Exit edit mode to add assets" : "Add Asset"}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Pie Chart */}
          <PieChart 
            assets={assets} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            isEditMode={isEditMode}
          />
        </div>

        {/* Position Analytics */}
        <PositionAnalytics assets={assets} />
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all"
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg mx-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Asset Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all"
                  placeholder="e.g., Apple Inc."
                />
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Type
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isStock"
                      value="true"
                      checked={formData.isStock === true}
                      onChange={() => setFormData(prev => ({ ...prev, isStock: true }))}
                    />
                    <span>Stock / ETF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isStock"
                      value="false"
                      checked={formData.isStock === false}
                      onChange={() => setFormData(prev => ({ ...prev, isStock: false }))}
                    />
                    <span>Bank Account</span>
                  </label>
                </div>
              </div>

              {/* Stock Fields */}
              {formData.isStock ? (
                <>
                  <InputField label="Ticker Symbol" name="ticker" value={formData.ticker} onChange={handleInputChange} placeholder="e.g., AAPL" />
                  <InputField label="Number of Shares" name="shares" value={formData.shares} onChange={handleInputChange} type="number" step="0.001" placeholder="e.g., 10.5" />
                  <InputField label="Price per Share" name="currentPrice" value={formData.currentPrice} onChange={handleInputChange} type="number" step="0.01" placeholder="e.g., 150.00" />
                </>
              ) : (
                <>
                  <InputField label="Account Balance" name="balance" value={formData.balance} onChange={handleInputChange} type="number" step="0.01" placeholder="e.g., 5000.00" />
                  <InputField label="Annual Percentage Yield (APY)" name="apy" value={formData.apy} onChange={handleInputChange} type="number" step="0.001" placeholder="e.g., 0.045 (for 4.5%)" />
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer"
                >
                  {editingAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}