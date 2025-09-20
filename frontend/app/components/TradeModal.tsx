"use client";
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Plus, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';
import { getApiUrl } from '../config/api';

interface Trade {
  id: number;
  date: string;
  ticker: string;
  realized_pnl?: number;
  percent_diff?: number;
}

interface ParsedTrade {
  date: string;
  ticker: string;
  realized_pnl?: number;
  percent_diff?: number;
}

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id'>) => void;
  editingTrade?: Trade | null;
  onAddParsedTrades?: (trades: ParsedTrade[]) => void;
}

export default function TradeModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingTrade, 
  onAddParsedTrades 
}: TradeModalProps) {
  const { token } = useAuth();
  const [uploadMode, setUploadMode] = useState<'manual' | 'image'>('manual');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [noTradesFound, setNoTradesFound] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    ticker: '',
    input_mode: 'pnl' as 'pnl' | 'buy_sell',
    realized_pnl: '',
    percent_diff: '',
    buy_amount: '',
    sell_amount: ''
  });

  // Reset form when editing trade changes
  React.useEffect(() => {
    if (editingTrade) {
      setFormData({
        date: editingTrade.date,
        ticker: editingTrade.ticker,
        input_mode: 'pnl',
        realized_pnl: (editingTrade.realized_pnl || 0).toString(),
        percent_diff: (editingTrade.percent_diff || 0).toString(),
        buy_amount: '',
        sell_amount: ''
      });
      setUploadMode('manual');
    } else {
      setFormData({
        date: new Date().toLocaleDateString('en-CA'),
        ticker: '',
        input_mode: 'pnl',
        realized_pnl: '',
        percent_diff: '',
        buy_amount: '',
        sell_amount: ''
      });
    }
  }, [editingTrade]);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    return () => {
      enableBodyScroll();
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Calculate percentage when buy/sell amounts change
      if (name === 'buy_amount' || name === 'sell_amount') {
        const buyAmount = parseFloat(newData.buy_amount) || 0;
        const sellAmount = parseFloat(newData.sell_amount) || 0;
        
        if (buyAmount > 0 && sellAmount > 0) {
          const pnl = sellAmount - buyAmount;
          const percentage = (pnl / buyAmount) * 100;
          newData.realized_pnl = pnl.toFixed(2);
          newData.percent_diff = percentage.toFixed(2);
        }
      }
      
      return newData;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedImages(imageFiles);
  };

  const processImagesWithGemini = async () => {
    if (selectedImages.length === 0 || !token) return;

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

      const response = await fetch(getApiUrl('/api/trades/parse-multiple-images'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          images: imageRequests
        }),
      });

      if (!response.ok) throw new Error('Failed to process images');

      const data = await response.json();
      const trades = data.trades || [];
      setParsedTrades(trades);
      setNoTradesFound(trades.length === 0);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Failed to process images. Please try again or use manual entry.');
      setNoTradesFound(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const addParsedTrades = () => {
    if (onAddParsedTrades && parsedTrades.length > 0) {
      onAddParsedTrades(parsedTrades);
    }
    setParsedTrades([]);
    setSelectedImages([]);
    setUploadMode('manual');
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.date || !formData.ticker) {
      return;
    }

    let pnlValue: number;
    let percentValue: number;

    if (formData.input_mode === 'pnl') {
      if (!formData.realized_pnl || !formData.percent_diff) {
        return;
      }
      pnlValue = parseFloat(formData.realized_pnl);
      percentValue = parseFloat(formData.percent_diff);
    } else {
      if (!formData.buy_amount || !formData.sell_amount) {
        return;
      }
      const buyAmount = parseFloat(formData.buy_amount);
      const sellAmount = parseFloat(formData.sell_amount);
      pnlValue = Number((sellAmount - buyAmount).toFixed(2));
      percentValue = Number(((pnlValue / buyAmount) * 100).toFixed(2));
    }
    
    // Check if dollar amount and percentage have different signs
    if ((pnlValue >= 0 && percentValue < 0) || (pnlValue < 0 && percentValue >= 0)) {
      alert('Dollar amount and percentage must have the same sign (both positive for profit, both negative for loss)');
      return;
    }
    
    const tradeData = {
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      realized_pnl: Number(pnlValue.toFixed(2)),
      percent_diff: Number(percentValue.toFixed(2))
    };

    onSave(tradeData);
    
    setFormData({
      date: new Date().toLocaleDateString('en-CA'),
      ticker: '',
      input_mode: 'pnl',
      realized_pnl: '',
      percent_diff: '',
      buy_amount: '',
      sell_amount: ''
    });
    
    onClose();
  };

  const closeModal = () => {
    onClose();
    setUploadMode('manual');
    setSelectedImages([]);
    setParsedTrades([]);
    setIsProcessing(false);
    setNoTradesFound(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-3 sm:p-4">
      <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-6 w-full max-w-sm mx-auto border border-gray-200 dark:border-gray-800/70 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg 2xl:text-lg font-medium text-black dark:text-white">
            {editingTrade ? 'Edit Trade' : 'Record Trade'}
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-black dark:text-white transition-colors cursor-pointer"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {!editingTrade && (
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setUploadMode('manual')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-1 transition-all cursor-pointer ${
                  uploadMode === 'manual'
                    ? 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white ring-1 ring-black dark:ring-white'
                    : 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white hover:border-gray-300'
                }`}
              >
                <FileText size={14} className="sm:w-4 sm:h-4" />
                <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">Manual Entry</span>
              </button>
              <button
                onClick={() => setUploadMode('image')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-1 transition-all cursor-pointer ${
                  uploadMode === 'image'
                    ? 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white ring-1 ring-black dark:ring-white'
                    : 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white hover:border-gray-300'
                }`}
              >
                <Upload size={14} className="sm:w-4 sm:h-4" />
                <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">Upload Image</span>
              </button>
            </div>
          </div>
        )}

        {uploadMode === 'image' && !editingTrade ? (
          <div className="space-y-3 sm:space-y-4">
            {selectedImages.length === 0 ? (
              <div className="border-1 border-dashed border-gray-300 rounded-lg p-3 sm:p-6 text-center">
                <Upload className="mx-auto h-6 w-6 sm:h-10 sm:w-10 text-gray-400 mb-2 sm:mb-3" />
                <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white mb-2 sm:mb-3">
                  Upload an image of your completed trades.
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="trade-image-upload"
                />
                <label
                  htmlFor="trade-image-upload"
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
                      <div className="w-6 h-6 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Upload className="h-3 w-3 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-black dark:text-white text-[10px] sm:text-[12px] 2xl:text-sm">{image.name}</div>
                        <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedImages(selectedImages.filter((_, i) => i !== index));
                        setParsedTrades([]);
                        setIsProcessing(false);
                      }}
                      className="text-gray-400 hover:text-black dark:text-white cursor-pointer"
                    >
                      <X size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
                
                {!isProcessing && parsedTrades.length === 0 && !noTradesFound && (
                  <button
                    onClick={processImagesWithGemini}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                  >
                    Process {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
                  </button>
                )}

                {!isProcessing && noTradesFound && (
                  <div className="text-center py-4 sm:py-6 space-y-2 sm:space-y-3">
                    <div className="text-black dark:text-white">
                      <p className="font-medium mb-2 text-[10px] sm:text-[12px] 2xl:text-sm">No trades found in the uploaded images.</p>
                      <p className="text-[10px] sm:text-[12px] 2xl:text-sm">Please try again with different images or use manual entry.</p>
                    </div>
                    <div className="flex flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setNoTradesFound(false);
                          setSelectedImages([]);
                        }}
                        className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-800/70 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => {
                          setUploadMode('manual');
                          setNoTradesFound(false);
                          setSelectedImages([]);
                        }}
                        className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                      >
                        Use Manual Entry
                      </button>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center py-4 sm:py-6">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-7 sm:w-7 border-b-2 border-blue-600 mx-auto mb-2 sm:mb-3"></div>
                    <div className="text-black dark:text-white text-[10px] sm:text-[12px] 2xl:text-sm">Processing {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}...</div>
                  </div>
                )}

                {parsedTrades.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Found {parsedTrades.length} trade(s):
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                      {parsedTrades.map((trade, index) => (
                        <div key={index} className="p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="font-medium text-black dark:text-white text-[10px] sm:text-[12px] 2xl:text-sm">
                            {trade.ticker}
                          </div>
                          <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">
                            {trade.date}
                          </div>
                          <div className="text-[10px] sm:text-[12px] 2xl:text-sm text-black dark:text-white">
                            P&L: ${trade.realized_pnl !== undefined && trade.realized_pnl !== null ? (trade.realized_pnl >= 0 ? '+' : '') + trade.realized_pnl.toFixed(2) : '0.00'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setParsedTrades([]);
                          setSelectedImages([]);
                          setIsProcessing(false);
                        }}
                        className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-800/70 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={addParsedTrades}
                        className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
                      >
                        Add All Trades
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-800/70 my-2 sm:my-3"></div>
            
            {/* Date and Ticker in same row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Date */}
              <div>
                <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Ticker */}
              <div>
                <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                  Ticker / Name *
                </label>
                <input
                  type="text"
                  name="ticker"
                  value={formData.ticker}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData(prev => ({
                      ...prev,
                      [name]: value.toUpperCase()
                    }));
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                  placeholder="e.g. AAPL"
                  required
                />
              </div>
            </div>

            {/* Input Mode Selector */}
            <div>
              <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-2">
                Input Method *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, input_mode: 'pnl' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-1 transition-all cursor-pointer ${
                    formData.input_mode === 'pnl'
                      ? 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white ring-1 ring-black dark:ring-white'
                      : 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">P&L Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, input_mode: 'buy_sell' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-1 transition-all cursor-pointer ${
                    formData.input_mode === 'buy_sell'
                      ? 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white ring-1 ring-black dark:ring-white'
                      : 'border-gray-200 dark:border-gray-800/70 text-black dark:text-white hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-[10px] sm:text-[12px] 2xl:text-sm">Buy/Sell Entry</span>
                </button>
              </div>
            </div>



            {/* Amount Fields - Dynamic based on input mode */}
            {formData.input_mode === 'pnl' ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* P&L Amount */}
                <div>
                  <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                    P&L Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="realized_pnl"
                      value={formData.realized_pnl}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Percentage */}
                <div>
                  <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                    Return % *
                  </label>
                  <input
                    type="number"
                    name="percent_diff"
                    value={formData.percent_diff}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                    step="0.1"
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Buy Amount */}
                <div>
                  <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                    Buy Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="buy_amount"
                      value={formData.buy_amount}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Sell Amount */}
                <div>
                  <label className="block text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white mb-1">
                    Sell Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="sell_amount"
                      value={formData.sell_amount}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black focus:border-black hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Results Display (for Buy/Sell mode) */}
            {formData.input_mode === 'buy_sell' && formData.buy_amount && formData.sell_amount && (
              <div className="">
                {/* <div className="text-[10px] sm:text-[12px] 2xl:text-sm font-medium text-gray-700">
                  Calculated Results:
                </div> */}
                <div className="grid grid-cols-2 gap-3 text-[10px] sm:text-[12px] 2xl:text-sm">
                  <div>
                    <span className="text-black dark:text-white">P&L:</span>
                    <span className={`ml-1 font-medium ${parseFloat(formData.realized_pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(formData.realized_pnl) >= 0 ? '+' : ''}${parseFloat(formData.realized_pnl).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-black dark:text-white">Return:</span>
                    <span className={`ml-1 font-medium ${parseFloat(formData.percent_diff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(formData.percent_diff) >= 0 ? '+' : ''}{parseFloat(formData.percent_diff).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
              <button
                onClick={closeModal}
                className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-800/70 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
              >
                {editingTrade ? 'Update Trade' : 'Record Trade'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
