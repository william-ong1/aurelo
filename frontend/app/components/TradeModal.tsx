"use client";
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Plus } from 'lucide-react';
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
    pnl_type: 'profit' as 'profit' | 'loss',
    realized_pnl: '',
    percent_diff: ''
  });

  // Reset form when editing trade changes
  React.useEffect(() => {
    if (editingTrade) {
      const pnlType = (editingTrade.realized_pnl || 0) >= 0 ? 'profit' : 'loss';
      setFormData({
        date: editingTrade.date,
        ticker: editingTrade.ticker,
        pnl_type: pnlType,
        realized_pnl: Math.abs(editingTrade.realized_pnl || 0).toString(),
        percent_diff: Math.abs(editingTrade.percent_diff || 0).toString()
      });
      setUploadMode('manual');
    } else {
      setFormData({
        date: new Date().toLocaleDateString('en-CA'), // Today's date in YYYY-MM-DD format
        ticker: '',
        pnl_type: 'profit',
        realized_pnl: '',
        percent_diff: ''
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

    // Cleanup on unmount
    return () => {
      enableBodyScroll();
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!formData.date || !formData.ticker || !formData.realized_pnl || !formData.percent_diff) {
      alert('Please fill in all required fields');
      return;
    }

    const pnlValue = parseFloat(formData.realized_pnl);
    const percentValue = parseFloat(formData.percent_diff);
    
    const tradeData = {
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      realized_pnl: formData.pnl_type === 'profit' ? pnlValue : -pnlValue,
      percent_diff: formData.pnl_type === 'profit' ? percentValue : -percentValue
    };

    onSave(tradeData);
    
    // Reset form data after successful submission
    setFormData({
      date: new Date().toLocaleDateString('en-CA'),
      ticker: '',
      pnl_type: 'profit',
      realized_pnl: '',
      percent_diff: ''
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
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-8 w-full max-w-lg mx-auto border border-gray-200/50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
            {editingTrade ? 'Edit Trade' : 'Record Completed Trade'}
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={20} className="sm:w-7 sm:h-7" />
          </button>
        </div>

        {!editingTrade && (
          <div className="mb-3 sm:mb-6">
            <div className="flex flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setUploadMode('manual')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all cursor-pointer ${
                  uploadMode === 'manual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <FileText size={16} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-base">Manual Entry</span>
              </button>
              <button
                onClick={() => setUploadMode('image')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all cursor-pointer ${
                  uploadMode === 'image'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Upload size={16} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-base">Upload Image</span>
              </button>
            </div>
          </div>
        )}

        {uploadMode === 'image' && !editingTrade ? (
          <div className="space-y-4 sm:space-y-5">
            {selectedImages.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center">
                <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <div className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Upload screenshots of your trading statements or P&L
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
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Choose Images
                </label>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Upload className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{image.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500">
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
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={16} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
                
                {!isProcessing && parsedTrades.length === 0 && !noTradesFound && (
                  <button
                    onClick={processImagesWithGemini}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-sm"
                  >
                    Process {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
                  </button>
                )}

                {!isProcessing && noTradesFound && (
                  <div className="text-center py-6 sm:py-8 space-y-3 sm:space-y-4">
                    <div className="text-gray-600">
                      <p className="font-medium mb-2 text-sm">No trades found in the uploaded images.</p>
                      <p className="text-xs sm:text-sm">Please try again with different images or use manual entry.</p>
                    </div>
                    <div className="flex flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setNoTradesFound(false);
                          setSelectedImages([]);
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => {
                          setUploadMode('manual');
                          setNoTradesFound(false);
                          setSelectedImages([]);
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
                      >
                        Use Manual Entry
                      </button>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
                    <div className="text-gray-600 text-sm">Processing {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}...</div>
                  </div>
                )}

                {parsedTrades.length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-700">
                      Found {parsedTrades.length} trade(s):
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {parsedTrades.map((trade, index) => (
                        <div key={index} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900 text-xs sm:text-sm">
                            {trade.ticker}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {trade.date}
                          </div>
                          {trade.realized_pnl && (
                            <div className="text-xs sm:text-sm text-gray-600">
                              P&L: ${trade.realized_pnl}
                            </div>
                          )}
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
                        className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={addParsedTrades}
                        className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
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
          <div className="space-y-4 sm:space-y-5">
            {/* Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all text-sm"
                required
              />
            </div>

            {/* Ticker */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Ticker Symbol *
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
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all text-sm"
                placeholder="e.g., AAPL"
                required
              />
            </div>

            {/* Profit/Loss Type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Trade Result *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pnl_type"
                    value="profit"
                    checked={formData.pnl_type === 'profit'}
                    onChange={handleInputChange}
                  />
                  <span className="text-sm">Profit</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pnl_type"
                    value="loss"
                    checked={formData.pnl_type === 'loss'}
                    onChange={handleInputChange}
                  />
                  <span className="text-sm">Loss</span>
                </label>
              </div>
            </div>

            {/* Dollar Amount */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Amount (Dollars) *
              </label>
              <input
                type="number"
                name="realized_pnl"
                value={formData.realized_pnl}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all text-sm"
                step="0.01"
                placeholder="e.g., 1250.50"
                required
              />
            </div>

            {/* Percentage */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Amount (Percentage) *
              </label>
              <input
                type="number"
                name="percent_diff"
                value={formData.percent_diff}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:border-black transition-all text-sm"
                step="0.1"
                placeholder="e.g., 8.5"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                onClick={closeModal}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-xs sm:text-sm"
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
