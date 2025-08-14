"use client";
import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Upload, FileText, LogIn, UserPlus } from 'lucide-react';
import PositionAnalytics from './components/PositionAnalytics';
import PieChart from './components/PieChart';
import { useRealTime } from './contexts/RealTimeContext';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';

interface Asset {
  id: number;
  name: string;
  isStock: boolean;
  ticker?: string;
  shares?: number;
  currentPrice?: number;
  purchasePrice?: number;
  balance?: number;
  apy?: number;
}

interface ParsedAsset {
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
        className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all text-base"
      />
    </div>
  );
}

// Local storage utilities
const STORAGE_KEY = 'portfolio_assets';

const loadAssetsFromStorage = (): Asset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const assets = stored ? JSON.parse(stored) : [];
    return assets;
  } catch (error) {
    console.error('Error loading assets from localStorage:', error);
    return [];
  }
};

const saveAssetsToStorage = (assets: Asset[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Error saving assets to localStorage:', error);
  }
};

export default function Home() {
  const { fetchPrices } = useRealTime();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'image'>('manual');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([]);
  const [timePeriod, setTimePeriod] = useState<'all-time' | 'today'>('all-time');
  const [formData, setFormData] = useState({
    name: '',
    isStock: true,
    ticker: '',
    shares: '',
    price: '',
    balance: '',
    apy: ''
  });
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load assets from backend when authenticated, localStorage when not
  useEffect(() => {
    if (isAuthenticated && token) {
      loadPortfolioFromBackend();
    } else if (!isAuthenticated && !isLoading && !hasLoadedFromStorage && !token) {
      // Load from localStorage if not authenticated and no token
      const storedAssets = loadAssetsFromStorage();
      setAssets(storedAssets);
      setHasLoadedFromStorage(true);
    }
  }, [isAuthenticated, token, isLoading, hasLoadedFromStorage]);

  // Reset flags and clear assets when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoadedFromStorage(false);
      setAssets([]); // Clear assets when user logs out
    }
  }, [isAuthenticated, token]); // Also depend on token to catch token removal

  // Save assets to backend when authenticated, localStorage when not
  useEffect(() => {
    if (isAuthenticated && token) {
      // Save to backend when authenticated (including empty portfolio)
      savePortfolioToBackend();
    } else if (!isAuthenticated && hasLoadedFromStorage) {
      // Save to localStorage if not authenticated and we've already loaded from storage
      saveAssetsToStorage(assets);
    }
  }, [assets, isAuthenticated, token, hasLoadedFromStorage]);

  const loadPortfolioFromBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const backendAssets = data.assets.map((asset: any, index: number) => ({
          ...asset,
          id: index + 1 // Generate local IDs
        }));
        setAssets(backendAssets);
      }
    } catch (error) {
      console.error('Error loading portfolio from backend:', error);
    }
  };

  const savePortfolioToBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/portfolio/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assets })
      });
      
      if (!response.ok) {
        console.error('Error saving portfolio to backend');
      } else {
        console.log('Portfolio saved to backend successfully');
      }
    } catch (error) {
      console.error('Error saving portfolio to backend:', error);
    }
  };

  const clearBackendPortfolio = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/portfolio/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assets: [] })
      });
      
      if (response.ok) {
        console.log('Backend portfolio cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing backend portfolio:', error);
    }
  };



  // Fetch real-time prices when assets change
  useEffect(() => {
    const stockTickers = assets
      .filter(asset => asset.isStock && asset.ticker)
      .map(asset => asset.ticker!)
      .filter((ticker, index, arr) => arr.indexOf(ticker) === index);
    
    if (stockTickers.length > 0) {
      fetchPrices(stockTickers);
    }
  }, [assets, fetchPrices]);

  // Generate next ID
  const getNextId = () => {
    if (assets.length === 0) return 1;
    return Math.max(...assets.map(a => a.id)) + 1;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const processImageWithGemini = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (!selectedImage) return reject("Image removed before processing");
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(selectedImage);
      });

      const response = await fetch('http://localhost:8000/api/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          mimeType: selectedImage.type
        }),
      });

      if (!response.ok) throw new Error('Failed to process image');

      const data = await response.json();
      setParsedAssets(data.assets || []);
    } catch (error) {
      console.error('Error processing image:', error);
      if (error !== "Image removed before processing") {
        alert('Failed to process image. Please try again or use manual entry.');
      }
    } finally {
      setIsProcessing(false);
    }
  };


  const addParsedAssets = () => {
    setAssets(prev => {
      let nextId = prev.length === 0 ? 1 : Math.max(...prev.map(a => a.id)) + 1;
      const newAssets = [...prev];
      
      parsedAssets.forEach(asset => {
        const index = newAssets.findIndex(existing =>
          existing.isStock === asset.isStock &&
          ((existing.isStock && existing.ticker === asset.ticker) || (!existing.isStock && existing.name === asset.name))
        );
        
        if (index !== -1) {
          // Update existing asset
          if (asset.isStock) {
            const existingShares = newAssets[index].shares || 0;
            const existingPrice = newAssets[index].currentPrice || 0;
            const newShares = asset.shares || 0;
            const newPrice = asset.currentPrice || 0;
            
            const totalShares = existingShares + newShares;
            const weightedAveragePrice = totalShares > 0 
              ? ((existingShares * existingPrice) + (newShares * newPrice)) / totalShares
              : newPrice;
            
            newAssets[index].shares = totalShares;
            newAssets[index].purchasePrice = weightedAveragePrice;
          } else {
            newAssets[index].balance = (newAssets[index].balance || 0) + (asset.balance || 0);
            // Backend returns APY as decimal, so we keep it as is
            newAssets[index].apy = asset.apy;
          }
        } else {
          // Add new asset with unique ID
          newAssets.push({ ...asset, id: nextId++ });
        }
      });
      
      return newAssets;
    });
    
    setParsedAssets([]);
    setSelectedImage(null);
    setUploadMode('manual');
    setShowModal(false);
  };

  const handleSubmit = () => {
    if (!formData.name) return;
    let assetData: Partial<Asset>;

    if (formData.isStock) {
      if (!formData.ticker || !formData.shares || !formData.price) return;
      assetData = {
        name: formData.name,
        isStock: true,
        ticker: formData.ticker.toUpperCase(),
        shares: parseFloat(formData.shares) || 0,
        currentPrice: parseFloat(formData.price) || 0,
        purchasePrice: parseFloat(formData.price) || 0
      };
    } else {
      if (!formData.balance || !formData.apy) return;
      assetData = {
        name: formData.name,
        isStock: false,
        balance: parseFloat(formData.balance) || 0,
        apy: (parseFloat(formData.apy) || 0) / 100 // Convert percentage to decimal
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
            const existingPrice = updated[index].purchasePrice || 0;
            const newShares = assetData.shares || 0;
            const newPrice = assetData.purchasePrice || 0;
            
            // Calculate weighted average price
            const totalShares = existingShares + newShares;
            const weightedAveragePrice = totalShares > 0 
              ? ((existingShares * existingPrice) + (newShares * newPrice)) / totalShares
              : newPrice;
            
            updated[index].shares = totalShares;
            updated[index].purchasePrice = weightedAveragePrice;
          } else {
            updated[index].balance = (updated[index].balance || 0) + (assetData.balance || 0);
            updated[index].apy = assetData.apy;
          }
          return updated;
        }
        const nextId = prev.length === 0 ? 1 : Math.max(...prev.map(a => a.id)) + 1;
        return [...prev, { ...assetData, id: nextId } as Asset];
      });
    }

    setFormData({ name: '', isStock: true, ticker: '', shares: '', price: '', balance: '', apy: '' });
    setShowModal(false);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      isStock: asset.isStock,
      ticker: asset.ticker || '',
      shares: asset.shares?.toString() || '',
      price: asset.purchasePrice?.toString() || asset.currentPrice?.toString() || '',
      balance: asset.balance?.toString() || '',
      apy: asset.apy ? (asset.apy * 100).toString() : '' // Convert decimal to percentage
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
    setUploadMode('manual');
    setSelectedImage(null);
    setParsedAssets([]);
    setFormData({ name: '', isStock: true, ticker: '', shares: '', price: '', balance: '', apy: '' });
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-between p-4 sm:p-8 lg:p-24 lg:pt-8 pt-4 sm:pt-8">


      {/* Aurelo Header */}
      <div className="w-full max-w-5xl mb-4 sm:mb-8">
        <div className="rounded-xl p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-lg border border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Aurelo
                    </h1>
                    <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200 shadow-sm">
                      Beta
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    Your assets, simplified.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <UserProfile onLogout={() => {
                  setAssets([]); // Immediately clear assets
                  logout();
                }} />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>
                </div>
              )}
              {/* <div className="flex items-center gap-2 text-gray-500">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">v1.0.0</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <div className="rounded-lg p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Portfolio Allocation</h2>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gray-100/60 backdrop-blur-sm rounded-full p-0.5 border border-gray-200/40">
                <button
                  onClick={() => setTimePeriod('all-time')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    timePeriod === 'all-time' 
                      ? 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-200/60' 
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white/50'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimePeriod('today')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    timePeriod === 'today' 
                      ? 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-200/60' 
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Today
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {if (assets.length > 0) {setIsEditMode(!isEditMode)}}}
                  disabled={assets.length === 0}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    assets.length === 0
                      ? 'text-gray-200 cursor-not-allowed'
                      : isEditMode && assets.length > 0
                      ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-200 shadow-sm cursor-pointer' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer'
                  }`}
                  title={assets.length === 0 ? "No assets to edit" : isEditMode && assets.length > 0 ? "Exit Edit Mode" : "Edit Portfolio"}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setShowModal(true);
                  }}
                  disabled={isEditMode && assets.length > 0}
                  className={`p-1 pr-2 rounded-lg transition-colors ${
                    isEditMode && assets.length > 0
                      ? 'text-gray-200 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-gray-600 transition-all cursor-pointer'
                  }`}
                  title={isEditMode && assets.length > 0 ? "Exit edit mode to add assets" : "Add Asset"}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <PieChart 
            assets={assets} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            isEditMode={isEditMode}
            timePeriod={timePeriod}
          />
        </div>

        {/* Position Analytics */}
        <PositionAnalytics assets={assets} />
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-lg mx-auto border border-gray-200/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={24} className="sm:w-7 sm:h-7" />
              </button>
            </div>

            {!editingAsset && (
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setUploadMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                      uploadMode === 'manual'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <FileText size={18} className="sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">Manual Entry</span>
                  </button>
                  <button
                    onClick={() => setUploadMode('image')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                      uploadMode === 'image'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Upload size={18} className="sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">Upload Image</span>
                  </button>
                </div>
              </div>
            )}

            {uploadMode === 'image' && !editingAsset ? (
              <div className="space-y-5">
                {!selectedImage ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="text-sm text-gray-600 mb-4">
                      Upload a screenshot of your portfolio or account statement
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    >
                      Choose Image
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Upload className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{selectedImage.name}</div>
                          <div className="text-sm text-gray-500">
                            {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setParsedAssets([]);
                          setIsProcessing(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {!isProcessing && parsedAssets.length === 0 && (
                      <button
                        onClick={processImageWithGemini}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer"
                      >
                        Process Image
                      </button>
                    )}

                    {isProcessing && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <div className="text-gray-600">Processing image ...</div>
                      </div>
                    )}

                    {parsedAssets.length > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-700">
                          Found {parsedAssets.length} asset(s):
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {parsedAssets.map((asset, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium text-gray-900">
                                {asset.isStock ? asset.ticker : asset.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {asset.isStock 
                                  ? `${asset.shares} shares @ $${asset.currentPrice || asset.purchasePrice}`
                                  : `$${asset.balance} @ ${((asset.apy || 0) * 100).toFixed(2)}% APY`
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => {
                              setParsedAssets([]);
                              setSelectedImage(null);
                              setIsProcessing(false);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors cursor-pointer"
                          >
                            Try Again
                          </button>

                          <button
                            onClick={addParsedAssets}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer"
                          >
                            Add All Assets
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
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
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
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
                      <span>Cash Account</span>
                    </label>
                  </div>
                </div>

                {/* Stock Fields */}
                {formData.isStock ? (
                  <>
                    <InputField label="Ticker Symbol" name="ticker" value={formData.ticker} onChange={handleInputChange} placeholder="e.g., AAPL" />
                    <InputField label="Number of Shares" name="shares" value={formData.shares} onChange={handleInputChange} type="number" step="0.001" placeholder="e.g., 10.5" />
                    <InputField label="Price per Share" name="price" value={formData.price} onChange={handleInputChange} type="number" step="0.01" placeholder="e.g., 150.00" />
                  </>
                ) : (
                  <>
                    <InputField label="Account Balance" name="balance" value={formData.balance} onChange={handleInputChange} type="number" step="0.01" placeholder="e.g., 5000.00" />
                    <InputField label="Annual Percentage Yield (APY)" name="apy" value={formData.apy} onChange={handleInputChange} type="number" step="0.1" placeholder="e.g., 4.5 (for 4.5%)" />
                  </>
                )}

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
            )}
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </main>
  );
}