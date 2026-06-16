import React, { useState, useEffect, useRef, useContext } from 'react';
import { Send, Sparkles, RefreshCw, ShoppingBag, Image, AlertTriangle, Check, X, HelpCircle, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { CartContext } from '../context/CartContext';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&auto=format&fit=crop&q=60';

const OutfitPlanner = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'model',
      text: "Hello! I'm your VastraCo AI Outfit Planner. I can design personalized outfit bundles tailored to your style, budget, and occasion. Let's get started!\n\nWho are we shopping for today? (Male / Female)"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  
  // Extracted parameters from the session
  const [params, setParams] = useState({
    gender: null,
    occasion: null,
    style: null,
    budget: null,
    colors: null,
    accessoriesNeeded: null,
    footwearNeeded: null
  });

  // Current recommended bundles
  const [bundles, setBundles] = useState([]);
  // Product IDs to exclude on regeneration
  const [excludeProductIds, setExcludeProductIds] = useState([]);

  // Preview Generation State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewBundle, setPreviewBundle] = useState(null);

  // Swapping State
  const [swappingItem, setSwappingItem] = useState(null); // { bundleId, itemIndex, item }
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Cart adding feedback
  const [addingToCartBundleId, setAddingToCartBundleId] = useState(null);
  const [cartFeedback, setCartFeedback] = useState('');

  const chatEndRef = useRef(null);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Quick Reply chips
  const handleQuickReply = (val) => {
    handleSendMessage(val);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) {
      setInput('');
    }

    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      text: text
    };

    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // Build history payload format for Gemini API
      const historyPayload = messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        text: m.text,
        extractedParams: m.extractedParams || null
      }));

      const response = await api.post('/ai/chat', {
        message: text,
        history: historyPayload,
        excludeProductIds: excludeProductIds
      });

      const data = response.data;

      // Update extracted parameters state
      if (data.extractedParams) {
        setParams(data.extractedParams);
      }

      const newBotMessage = {
        id: Date.now() + 1,
        role: 'model',
        text: data.message,
        extractedParams: data.extractedParams
      };

      setMessages(prev => [...prev, newBotMessage]);

      if (data.status === 'recommendation' && data.bundles) {
        setBundles(data.bundles);
        // Track the current product IDs for future "regenerate/alternative" requests
        const ids = data.bundles.flatMap(b => b.items.map(i => i.id));
        setExcludeProductIds(prev => [...new Set([...prev, ...ids])]);
      }
    } catch (error) {
      console.error('Error sending message to AI service:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        text: "I'm sorry, I encountered an issue connecting to the styling service. Please check your network connection or try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Regeneration Trigger (Alternatives)
  const handleRequestAlternatives = () => {
    handleSendMessage("Please show me some alternative options.");
  };

  // Swapping Items
  const handleOpenSwapModal = async (bundleId, itemIndex, item) => {
    setSwappingItem({ bundleId, itemIndex, item });
    setLoadingAlternatives(true);
    setAlternatives([]);

    try {
      // Fetch alternative products of the same category
      const res = await api.get('/products', {
        params: {
          category: item.category_id,
          limit: 100
        }
      });
      // Filter out the current item and match target gender
      const filtered = res.data.filter(p => 
        p.id !== item.id && 
        (p.gender === (params.gender || 'Unisex') || p.gender === 'Unisex')
      );
      setAlternatives(filtered);
    } catch (err) {
      console.error('Error fetching alternative swap items:', err);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectSwapItem = (replacementItem) => {
    if (!swappingItem) return;

    const { bundleId, itemIndex } = swappingItem;

    setBundles(prevBundles => {
      return prevBundles.map(bundle => {
        if (bundle.bundleId !== bundleId) return bundle;

        // Replace the item
        const updatedItems = [...bundle.items];
        updatedItems[itemIndex] = replacementItem;

        // Recalculate price
        const newPrice = updatedItems.reduce((sum, item) => sum + Number(item.price), 0);

        // Recalculate budget score
        const budgetLimit = params.budget || 5000;
        const newBudgetMatch = newPrice <= budgetLimit
          ? 100
          : Math.max(50, Math.round((1 - (newPrice - budgetLimit) / budgetLimit) * 100));

        // Format updated explanation
        const styleName = (params.style || 'modern').toLowerCase();
        const occasionName = (params.occasion || 'outing').toLowerCase();
        const newExplanation = `${bundle.name} features a high-grade ${replacementItem.brand || 'premium'} style. This combination is tailored for a ${styleName} vibe, matching the ${occasionName} occasion requirement. At ₹${newPrice}, it represents a ${newBudgetMatch}% budget match score.`;

        return {
          ...bundle,
          totalPrice: newPrice,
          explanation: newExplanation,
          scores: {
            ...bundle.scores,
            budgetMatch: newBudgetMatch
          },
          items: updatedItems
        };
      });
    });

    setSwappingItem(null);
  };

  // Preview Generation (On-Demand)
  const handleGeneratePreview = async (bundle) => {
    setPreviewBundle(bundle);
    setPreviewImage(null);
    setPreviewLoading(true);

    try {
      const res = await api.post('/ai/preview', {
        gender: params.gender || 'Male',
        style: params.style || 'Casual',
        occasion: params.occasion || 'Casual Outing',
        items: bundle.items
      });
      setPreviewImage(res.data.imageUrl);
    } catch (error) {
      console.error('Error generating try-on preview:', error);
      // Fallback
      setPreviewImage("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add Complete Bundle to Cart
  const handleAddBundleToCart = async (bundle) => {
    setAddingToCartBundleId(bundle.bundleId);
    setCartFeedback("Checking stocks and preparing items...");

    try {
      for (const item of bundle.items) {
        setCartFeedback(`Adding ${item.name} to cart...`);
        // Fetch full product to get variant detail
        const productRes = await api.get(`/products/${item.id}`);
        const fullProduct = productRes.data;

        if (fullProduct.variants && fullProduct.variants.length > 0) {
          // Find first variant in stock
          const variant = fullProduct.variants.find(v => v.stock_quantity > 0) || fullProduct.variants[0];
          addToCart(fullProduct, variant, 1);
        } else {
          // Fallback dummy variant if no variants seeded
          const dummyVariant = { id: `${item.id}-default`, size: 'M', color: 'Standard', stock_quantity: 10 };
          addToCart(fullProduct, dummyVariant, 1);
        }
      }
      setCartFeedback("Success! Outfit added to cart.");
      setTimeout(() => {
        setAddingToCartBundleId(null);
        setCartFeedback('');
      }, 3000);
    } catch (error) {
      console.error('Failed to add bundle items to cart:', error);
      setCartFeedback("Error adding some items to cart. Please try again.");
      setTimeout(() => {
        setAddingToCartBundleId(null);
        setCartFeedback('');
      }, 3000);
    }
  };

  // Add individual item to cart
  const handleAddSingleItemToCart = async (item) => {
    try {
      const productRes = await api.get(`/products/${item.id}`);
      const fullProduct = productRes.data;

      if (fullProduct.variants && fullProduct.variants.length > 0) {
        const variant = fullProduct.variants.find(v => v.stock_quantity > 0) || fullProduct.variants[0];
        addToCart(fullProduct, variant, 1);
      } else {
        const dummyVariant = { id: `${item.id}-default`, size: 'M', color: 'Standard', stock_quantity: 10 };
        addToCart(fullProduct, dummyVariant, 1);
      }
    } catch (error) {
      console.error('Failed to add single item to cart:', error);
    }
  };

  // Start new planning session
  const handleResetSession = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'model',
        text: "Let's plan a fresh outfit! Who are we shopping for today? (Male / Female)"
      }
    ]);
    setInput('');
    setBundles([]);
    setExcludeProductIds([]);
    setParams({
      gender: null,
      occasion: null,
      style: null,
      budget: null,
      colors: null,
      accessoriesNeeded: null,
      footwearNeeded: null
    });
  };

  // Determine current active question options to help user type quickly
  const getSuggestions = () => {
    if (!params.gender) {
      return ["Male", "Female"];
    }
    if (!params.occasion) {
      return ["Wedding", "Farewell", "Office", "Casual Outing", "Festive", "Engagement", "College"];
    }
    if (!params.style) {
      return ["Traditional", "Western", "Casual", "Formal"];
    }
    if (!params.budget) {
      return ["Budget: ₹3,000", "Budget: ₹5,000", "Budget: ₹10,000", "Budget: ₹15,000"];
    }
    if (params.footwearNeeded === null) {
      return ["Include footwear & accessories", "Clothing only"];
    }
    return [];
  };

  const suggestions = getSuggestions();

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] font-body py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-extrabold text-brand-dark tracking-tight sm:text-5xl flex items-center justify-center gap-3">
            <Sparkles className="text-brand-accent animate-pulse h-8 w-8" />
            AI Outfit Planner
          </h1>
          <p className="mt-2 text-lg text-slate-600 max-w-2xl mx-auto">
            Design your custom fashion statement. Converse with our AI stylist, discover matching styles, and build your perfect ensemble.
          </p>
        </div>

        {/* Master Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Chat Canvas Section */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col h-[650px] overflow-hidden">
            {/* Session Toolbar */}
            <div className="px-6 py-4 bg-brand-dark text-white flex justify-between items-center border-b border-brand-dark">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-ping"></div>
                <span className="font-heading font-semibold tracking-wide">Stylist Session</span>
              </div>
              <button 
                onClick={handleResetSession} 
                className="text-xs font-semibold bg-brand-accent text-brand-dark hover:bg-yellow-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </div>

            {/* Chat Bubble Scrollable List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-line ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-r from-indigo-600 to-brand-dark text-white rounded-tr-none' 
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span>AI Stylist is styling...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick reply Suggestions Chips */}
            {suggestions.length > 0 && !loading && (
              <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuickReply(s.replace("Budget: ", "").replace("Include footwear & accessories", "yes").replace("Clothing only", "no footwear or accessories"))}
                    className="text-xs bg-white text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-400 font-medium px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input box */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
              className="p-4 bg-white border-t border-slate-100 flex items-center gap-2"
            >
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Talk to the AI Stylist..."
                disabled={loading}
                className="flex-grow border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed p-3 rounded-xl transition-all"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Outfit Recommendations side panel */}
          <div className="lg:col-span-7 h-[650px] flex flex-col">
            
            {bundles.length > 0 ? (
              <div className="flex flex-col h-full space-y-4">
                
                {/* Panel Actions / Meta info */}
                <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-sm">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-slate-800">Your Tailored Outfit Bundles</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Budget Target: ₹{params.budget || 5000} | Occasion: {params.occasion || 'Casual'}</p>
                  </div>
                  <button 
                    onClick={handleRequestAlternatives}
                    className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-brand-dark text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Show Alternatives
                  </button>
                </div>

                {/* Bundle Scroll View */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                  {bundles.map((bundle) => {
                    const exceedsBudget = bundle.totalPrice > (params.budget || 5000);
                    const overAmount = bundle.totalPrice - (params.budget || 5000);
                    
                    return (
                      <div 
                        key={bundle.bundleId} 
                        className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden relative"
                      >
                        {/* Bundle Header Banner */}
                        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                          <div>
                            <span className="bg-brand-accent text-brand-dark text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full mr-2">
                              Bundle {bundle.bundleId}
                            </span>
                            <span className="font-heading font-extrabold text-lg text-brand-light">{bundle.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Total Price</span>
                            <span className="text-xl font-bold text-brand-accent">₹{Number(bundle.totalPrice).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Live Budget Warnings */}
                        {exceedsBudget && (
                          <div className="bg-red-50 border-y border-red-100 text-red-700 px-6 py-3 text-sm flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div>
                              This bundle exceeds your target budget by <span className="font-bold">₹{overAmount.toFixed(2)}</span>. 
                              Try swapping items below to reduce the cost!
                            </div>
                          </div>
                        )}

                        {/* Bundle Content details */}
                        <div className="p-6 space-y-6">
                          
                          {/* Recommended items list */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ensemble Elements</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {bundle.items.map((item, idx) => (
                                <div 
                                  key={`${item.id}-${idx}`} 
                                  className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition-all"
                                >
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name} 
                                    className="w-12 h-15 object-cover rounded-lg bg-gray-200 flex-shrink-0"
                                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] text-indigo-600 font-semibold uppercase block tracking-wider">{item.category_name}</span>
                                    <h5 className="text-sm font-semibold text-slate-800 truncate" title={item.name}>{item.name}</h5>
                                    <p className="text-xs text-slate-500 font-medium truncate">{item.brand}</p>
                                    <span className="text-sm font-bold text-slate-900 block mt-0.5">₹{Number(item.price).toFixed(2)}</span>
                                  </div>
                                  
                                  {/* Item Actions */}
                                  <div className="flex flex-col gap-1.5">
                                    <button 
                                      onClick={() => handleOpenSwapModal(bundle.bundleId, idx, item)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-colors"
                                      title="Swap Item"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleAddSingleItemToCart(item)}
                                      className="p-1.5 text-slate-500 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-colors"
                                      title="Add Item to Cart"
                                    >
                                      <ShoppingBag className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Matching Metrics & Explanations */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            
                            {/* Visual Progress scores */}
                            <div className="md:col-span-5 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Styling Scores</h4>
                              
                              <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                  <span>Occasion Match</span>
                                  <span>{bundle.scores.occasionMatch}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${bundle.scores.occasionMatch}%` }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                  <span>Style Appropriateness</span>
                                  <span>{bundle.scores.styleMatch}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${bundle.scores.styleMatch}%` }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                  <span>Budget Compliance</span>
                                  <span className={exceedsBudget ? 'text-red-500' : 'text-emerald-600'}>
                                    {bundle.scores.budgetMatch}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${exceedsBudget ? 'bg-red-500' : 'bg-brand-accent'}`} 
                                    style={{ width: `${bundle.scores.budgetMatch}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Styled explanations */}
                            <div className="md:col-span-7 bg-indigo-50 border border-indigo-100/40 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed relative overflow-hidden">
                              <Sparkles className="h-10 w-10 text-indigo-200/50 absolute -right-2 -bottom-2 transform rotate-12" />
                              <span className="font-bold text-indigo-950 uppercase text-[9px] tracking-wider block mb-1.5">Stylist's Note</span>
                              {bundle.explanation}
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                            <button
                              onClick={() => handleGeneratePreview(bundle)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <Image className="h-4 w-4" />
                              Generate Preview
                            </button>

                            <button
                              onClick={() => handleAddBundleToCart(bundle)}
                              disabled={addingToCartBundleId !== null}
                              className={`text-xs font-bold text-brand-dark px-5 py-2.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg ${
                                addingToCartBundleId === bundle.bundleId
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'bg-brand-accent hover:bg-yellow-500'
                              }`}
                            >
                              <ShoppingBag className="h-4 w-4" />
                              {addingToCartBundleId === bundle.bundleId ? (
                                <span>{cartFeedback}</span>
                              ) : (
                                <span>Add Complete Outfit to Cart</span>
                              )}
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Recommendation Empty State */
              <div className="bg-white border border-slate-200 rounded-2xl flex-1 flex flex-col justify-center items-center p-8 text-center shadow-lg">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-inner">
                  <Sparkles className="h-12 w-12 text-brand-accent animate-pulse" />
                </div>
                <h3 className="text-xl font-heading font-bold text-slate-800">Ready to design your outfits?</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
                  Provide details about your gender, style preferences, occasion, and budget target to our AI stylist in the chat.
                </p>
                <div className="mt-8 flex flex-col space-y-3 w-full max-w-xs text-left bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Stylist Process</span>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">1</div>
                    <span>Specify your design parameters</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">2</div>
                    <span>Receive 3 harmonized collections</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">3</div>
                    <span>Swap items & view custom try-on preview</span>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Item Swapping Dialog Modal */}
        {swappingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-heading font-bold text-lg">Swap Outfit Element</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Choose an alternative for "{swappingItem.item.name}"</p>
                </div>
                <button 
                  onClick={() => setSwappingItem(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Alternatives Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                {loadingAlternatives ? (
                  <div className="flex flex-col justify-center items-center py-12 space-y-3">
                    <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-slate-600 font-medium">Scanning catalog for matching pieces...</span>
                  </div>
                ) : alternatives.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {alternatives.map((alt) => (
                      <div 
                        key={alt.id}
                        onClick={() => handleSelectSwapItem(alt)}
                        className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
                      >
                        <img 
                           src={alt.image_url} 
                           alt={alt.name} 
                           className="w-16 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                           onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">{alt.brand}</span>
                          <h4 className="text-sm font-bold text-slate-800 truncate">{alt.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 truncate">{alt.description}</p>
                          <span className="text-sm font-extrabold text-indigo-600 mt-1.5 block">₹{Number(alt.price).toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full p-1.5 transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-600 mt-2 font-medium">No other matching pieces found in the catalog.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSwappingItem(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        )}

        {/* AI Try-On Image Preview Dialog Modal */}
        {previewBundle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-heading font-bold text-lg">AI Outfit Try-On Preview</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{previewBundle.name}</p>
                </div>
                <button 
                  onClick={() => setPreviewBundle(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Preview Image display */}
              <div className="flex-1 bg-slate-950 flex items-center justify-center p-6 min-h-[350px]">
                {previewLoading ? (
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <div className="h-12 w-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold tracking-wide text-brand-light animate-pulse">Running AI try-on rendering...</span>
                  </div>
                ) : previewImage ? (
                  <div className="max-w-[320px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                    <img 
                      src={previewImage} 
                      alt="AI Styled try-on photograph" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <span>Failed to render preview. Please try again.</span>
                  </div>
                )}
              </div>

              {/* Modal Footer info */}
              <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div className="text-xs text-slate-500 max-w-[70%]">
                  This preview renders the combined look of the garments matching your styling guidelines.
                </div>
                <button
                  onClick={() => setPreviewBundle(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OutfitPlanner;
