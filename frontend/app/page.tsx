"use client";
import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Upload, FileText, DollarSign } from 'lucide-react';
import PositionAnalytics from './components/PositionAnalytics';
import PieChart from './components/PieChart';
import PerformanceSection from './components/PerformanceSection';
import HoldingsSection from './components/HoldingsSection';
import { useRealTime } from './contexts/RealTimeContext';
import { useAuth } from './contexts/AuthContext';
import { usePortfolio } from './contexts/PortfolioContext';
import { disableBodyScroll, enableBodyScroll } from './utils/scrollLock';
import { getApiUrl } from './config/api';

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

function InputField({ label, ...props }: { label: string; [key: string]: unknown }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
      />
    </div>
  );
}



export default function Home() {
  const { realTimePrices, dailyData, lastUpdated, failedTickers, fetchPrices } = useRealTime();
  
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const { assets, setAssets, isLoading: isLoadingAssets, hasLoadedFromStorage } = usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'image'>('manual');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
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
  const [isBannerMinimized, setIsBannerMinimized] = useState(true);

  // Portfolio context handles asset loading automatically

  // Handle body scroll locking for modals
  useEffect(() => {
    if (showModal) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    return () => {
      enableBodyScroll();
    };
  }, [showModal]);





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
    const newValue = type === 'checkbox' ? e.target.checked : value;
    console.log(`Form field changed: ${name} = ${newValue}`);
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedImages(imageFiles);
  };

  const processImagesWithGemini = async () => {
    if (selectedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const imageRequests = [];
      
      for (const image of selectedImages) {
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = () => reject("Failed to read image");
          reader.readAsDataURL(image);
        });
        
        imageRequests.push({
          image: base64Image,
          mimeType: image.type
        });
      }

      const response = await fetch(getApiUrl('/api/parse-multiple-images'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageRequests
        }),
      });

      if (!response.ok) throw new Error('Failed to process images');

      const data = await response.json();
      setParsedAssets(data.assets || []);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Failed to process images. Please try again or use manual entry.');
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
          existing.isStock === Boolean(asset.isStock) &&
          ((Boolean(asset.isStock) && existing.ticker === asset.ticker) || (!Boolean(asset.isStock) && existing.name === asset.name))
        );
        
        if (index !== -1) {
          // Update existing asset
          if (Boolean(asset.isStock)) {
            const existingShares = newAssets[index].shares || 0;
            const existingPrice = newAssets[index].purchasePrice || newAssets[index].currentPrice || 0;
            const newShares = asset.shares || 0;
            const newPrice = asset.currentPrice || 0;
            
            const totalShares = existingShares + newShares;
            const weightedAveragePrice = totalShares > 0 
              ? ((existingShares * existingPrice) + (newShares * newPrice)) / totalShares
              : newPrice;
            
            newAssets[index].shares = totalShares;
            newAssets[index].purchasePrice = weightedAveragePrice;
            newAssets[index].currentPrice = asset.currentPrice;
          } else {
            newAssets[index].balance = (newAssets[index].balance || 0) + (asset.balance || 0);
            // Backend returns APY as decimal, so we keep it as is
            newAssets[index].apy = asset.apy;
          }
        } else {
          // Add new asset with unique ID and proper Asset format
          const newAsset: Asset = {
            ...asset,
            id: nextId++,
            isStock: Boolean(asset.isStock),
            purchasePrice: Boolean(asset.isStock) ? (asset.currentPrice || 0) : undefined
          };
          newAssets.push(newAsset);
        }
      });
      
      return newAssets;
    });
    
    setParsedAssets([]);
    setSelectedImages([]);
    setUploadMode('manual');
    setShowModal(false);
  };

  const handleSubmit = () => {
    console.log('Submitting form with data:', formData);
    if (!formData.name) return;
    let assetData: Partial<Asset>;

    // Ensure isStock is properly set as boolean
    const isStock = Boolean(formData.isStock);
    console.log('Form data isStock:', formData.isStock, 'Converted to:', isStock);

    if (isStock) {
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
          asset.isStock === Boolean(assetData.isStock) &&
          ((Boolean(assetData.isStock) && asset.ticker === assetData.ticker) || (!Boolean(assetData.isStock) && asset.name === assetData.name))
        );
        if (index !== -1) {
          const updated = [...prev];
          if (Boolean(assetData.isStock)) {
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
            console.log('Updated existing stock asset:', updated[index]);
          } else {
            updated[index].balance = (updated[index].balance || 0) + (assetData.balance || 0);
            updated[index].apy = assetData.apy;
            console.log('Updated existing cash asset:', updated[index]);
          }
          return updated;
        }
        const nextId = prev.length === 0 ? 1 : Math.max(...prev.map(a => a.id)) + 1;
        const newAsset = { ...assetData, id: nextId } as Asset;
        console.log('Created new asset:', newAsset);
        return [...prev, newAsset];
      });
    }

    setFormData({ name: '', isStock: true, ticker: '', shares: '', price: '', balance: '', apy: '' });
    console.log('Form reset, isStock set to:', true);
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
    setSelectedImages([]);
    setParsedAssets([]);
    setFormData({ name: '', isStock: true, ticker: '', shares: '', price: '', balance: '', apy: '' });
    console.log('Modal closed, form reset with isStock:', true);
  };

  const { isLoading: isAuthLoading } = useAuth();
  const [isPageReady, setIsPageReady] = useState(false);

  // Set page as ready after authentication check is complete
  useEffect(() => {
    if (!isAuthLoading) {
      setIsPageReady(true);
    }
  }, [isAuthLoading]);


  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div></div>
    );
  }

  // Show loading state while checking authentication or loading assets
  if (isLoading || isLoadingAssets) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
            Loading portfolio...
          </p>
          <p className="text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
            Retrieving your portfolio data
          </p>
        </div>
      </div>
    );
  }


  // Check if we have real-time prices for all valid stock assets (exclude invalid tickers)
  const validStockAssets = assets.filter(asset => 
    asset.isStock && asset.ticker && !failedTickers.includes(asset.ticker)
  );
  const hasAllPrices = validStockAssets.length === 0 || validStockAssets.every(asset => realTimePrices[asset.ticker!]);
  const isInitialLoading = !hasAllPrices;

  // Show loading state while fetching initial prices
  if (isInitialLoading && validStockAssets.length > 0) {
    // return (
    //   <div className="flex items-center justify-center rounded-lg w-full h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] 2xl:h-[360px]">
    //     <div className="text-center">
    //       <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
    //       <div className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">Loading prices...</div>
    //       <div className="text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">Fetching real-time data</div>
    //     </div>
    //   </div>
    // );

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
            Loading prices...
          </p>
          <p className="text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
            Fetching real-time data
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {isPageReady && (
        <main className="mx-auto px-4 sm:px-6 lg:px-8 pt-19 sm:pt-9 pb-8 sm:pb-9 max-w-6xl 2xl:max-w-7xl">
          {/* Top Row - Overview and Holdings */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Overview Box - Fixed size */}
            <div className="lg:w-2/5 bg-white dark:bg-black rounded-lg p-4 pt-3 shadow-sm border border-slate-200 dark:border-gray-600 h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Overview</h3>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="flex items-center bg-gray-50 dark:bg-gray-900/50 backdrop-blur rounded-full p-1 border border-gray-200/60 dark:border-gray-700/60 shadow-sm gap-1">
                    <button
                      onClick={() => setTimePeriod('all-time')}
                      className={`px-1.5 sm:px-2 2xl:px-3 py-.7 sm:py-1 2xl:py-1.5 text-[.55rem] 2xl:text-[.8rem] font-medium rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                        timePeriod === 'all-time'
                          ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow ring-1 ring-gray-300 dark:ring-gray-700 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setTimePeriod('today')}
                      className={`px-1.5 sm:px-2 2xl:px-3 py-.7 sm:py-1 2xl:py-1.5 text-[.55rem] 2xl:text-[.8rem] font-medium rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                        timePeriod === 'today'
                          ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow ring-1 ring-gray-300 dark:ring-gray-700 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      Today
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Pie Chart */}
              <div className="flex items-center justify-center h-[calc(400px-80px)]">
                <PieChart 
                  assets={assets} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  isEditMode={isEditMode}
                  timePeriod={timePeriod}
                  isLoadingAssets={isLoadingAssets}
                />
              </div>
            </div>

            {/* Holdings Box - Takes remaining space */}
            <div className="lg:w-3/5">
              <HoldingsSection 
                assets={assets} 
                isLoadingAssets={isLoadingAssets}
                isEditMode={isEditMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEditMode={() => {if (assets.length > 0) {setIsEditMode(!isEditMode)}}}
                onAddAsset={() => {
                  setIsEditMode(false);
                  setShowModal(true);
                }}
                timePeriod={timePeriod}
              />
            </div>
          </div>

          {/* Position Analytics */}
          <PositionAnalytics assets={assets} isLoadingAssets={isLoadingAssets} />

          {/* Performance Section */}
          <PerformanceSection />
        </main>
      )}

        {/* Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-3 sm:p-4"
          >
            <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-6 w-full max-w-sm mx-auto border border-gray-200 dark:border-gray-600 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-sm sm:text-lg 2xl:text-lg font-semibold text-black dark:text-white">
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              {!editingAsset && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => setUploadMode('manual')}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-1 transition-all cursor-pointer ${
                        uploadMode === 'manual'
                          ? 'border-gray-200 dark:border-gray-600 text-black dark:text-white ring-1 ring-black dark:ring-white'
                          : 'border-gray-200 dark:border-gray-600 text-black dark:text-white hover:border-gray-300'
                      }`}
                    >
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                      <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">Manual Entry</span>
                    </button>
                    <button
                      onClick={() => setUploadMode('image')}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-1 transition-all cursor-pointer ${
                        uploadMode === 'image'
                          ? 'border-gray-200 dark:border-gray-600 text-black dark:text-white ring-1 ring-black dark:ring-white'
                          : 'border-gray-200 dark:border-gray-600 text-black dark:text-white hover:border-gray-300'
                      }`}
                    >
                      <Upload size={14} className="sm:w-4 sm:h-4" />
                      <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">Upload Image</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 mt-3 sm:mt-4"></div>
                </div>
              )}

              {uploadMode === 'image' && !editingAsset ? (
                <div className="space-y-3 sm:space-y-4">
                  {selectedImages.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-6 text-center">
                      <Upload className="mx-auto h-6 w-6 sm:h-10 sm:w-10 text-gray-400 mb-2 sm:mb-3" />
                      <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white mb-2 sm:mb-3">
                        Upload images of your portfolio or holdings
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-transparent text-[10px] sm:text-[12px] 2xl:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        Choose Images
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Upload className="h-3 w-3 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-[10px] sm:text-[12px] 2xl:text-sm">{image.name}</div>
                              <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-gray-900 dark:text-gray-100">
                                {(image.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedImages(selectedImages.filter((_, i) => i !== index));
                              setParsedAssets([]);
                              setIsProcessing(false);
                            }}
                            className="text-gray-400 hover:text-black dark:hover:text-white dark:text-white cursor-pointer"
                          >
                            <X size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))}
                      
                      {!isProcessing && parsedAssets.length === 0 && (
                        <button
                          onClick={processImagesWithGemini}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                        >
                          Process {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
                        </button>
                      )}

                      {isProcessing && (
                        <div className="text-center py-4 sm:py-6">
                          <div className="animate-spin rounded-full h-5 w-5 sm:h-7 sm:w-7 border-b-2 border-blue-600 mx-auto mb-2 sm:mb-3"></div>
                          <div className="text-black dark:text-white text-[10px] sm:text-[12px] 2xl:text-sm">Processing {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}...</div>
                        </div>
                      )}

                      {parsedAssets.length > 0 && (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-gray-700 dark:text-gray-300">
                            Found {parsedAssets.length} asset(s):
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {parsedAssets.map((asset, index) => (
                              <div key={index} className="p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-[10px] sm:text-[12px] 2xl:text-sm">
                                  {asset.isStock ? asset.ticker : asset.name}
                                </div>
                                <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">
                                  {asset.isStock 
                                    ? `${asset.shares} shares @ $${asset.currentPrice}`
                                    : `$${asset.balance} @ ${((asset.apy || 0) * 100).toFixed(2)}% APY`
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-row gap-2 sm:gap-3">
                            <button
                              onClick={() => {
                                setParsedAssets([]);
                                setSelectedImages([]);
                                setIsProcessing(false);
                              }}
                              className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                            >
                              Try Again
                            </button>

                            <button
                              onClick={addParsedAssets}
                              className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
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
                <div className="space-y-3 sm:space-y-4">
                  {/* Asset Type */}
                  <div>
                    <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-2">Asset Type *</label>
                    <div className="flex flex-row gap-4 sm:gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="isStock" 
                          checked={formData.isStock === true} 
                          onChange={() => {
                            console.log('Radio button changed: Stock/ETF selected');
                            setFormData(prev => ({ ...prev, isStock: true }));
                          }} 
                        />
                        <span className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">Stock / ETF</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="isStock" 
                          checked={formData.isStock === false} 
                          onChange={() => {
                            console.log('Radio button changed: Cash Account selected');
                            setFormData(prev => ({ ...prev, isStock: false }));
                          }} 
                        />
                        <span className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">Cash Account</span>
                      </label>
                    </div>
                  </div>

                  {/* Row: Name + Ticker */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">Asset Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                        placeholder="e.g. Apple Inc."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">Ticker {formData.isStock ? '*' : ''}</label>
                      <input
                        type="text"
                        name="ticker"
                        value={formData.ticker}
                        onChange={(e) => {
                          const { name, value } = e.target;
                          setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
                        }}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm ${
                          !formData.isStock 
                            ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-white dark:bg-black text-black dark:text-white'
                        }`}
                        placeholder="e.g. AAPL"
                        required={formData.isStock}
                        disabled={!formData.isStock}
                      />
                    </div>
                  </div>

                  {/* Row: Shares + Price (for Stock) or Balance + APY (for Cash) */}
                  {formData.isStock ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">Number of Shares *</label>
                        <input
                          type="number"
                          name="shares"
                          value={formData.shares}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                          step="0.001"
                          placeholder="e.g., 10.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">Price per Share *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">Account Balance *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            name="balance"
                            value={formData.balance}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">APY (%) *</label>
                        <input
                          type="number"
                          name="apy"
                          value={formData.apy}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                          step="0.1"
                          placeholder="0.0"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
                    <button onClick={closeModal} className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm">{editingAsset ? 'Update Asset' : 'Add Asset'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Auth modal moved to global sidebar layout */}
    </div>
  );
}