
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Download, MessageSquare, Printer, Settings, Info, RefreshCw, X, Crown } from 'lucide-react';
import { ImageSize, ColoringPageData, ChatMessage } from './types';
import { generatePrompts, generateColoringImage, getChatResponse } from './services/geminiService';
import { createColoringBookPDF } from './utils/pdfGenerator';

const App: React.FC = () => {
  const [childName, setChildName] = useState('');
  const [theme, setTheme] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pages, setPages] = useState<ColoringPageData[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    }
  };

  const setupApiKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per instructions
      setApiKeyReady(true);
    }
  };

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !theme) return;

    // Only force key setup for 2K/4K which use gemini-3-pro-image-preview
    if ((imageSize === '2K' || imageSize === '4K') && !apiKeyReady) {
      await setupApiKey();
    }

    setIsGenerating(true);
    setPages([]);

    try {
      const promptList = await generatePrompts(theme);
      const initialPages: ColoringPageData[] = promptList.map((p, idx) => ({
        id: `page-${idx}`,
        prompt: p,
        loading: true
      }));
      setPages(initialPages);

      for (let i = 0; i < initialPages.length; i++) {
        try {
          const url = await generateColoringImage(initialPages[i].prompt, imageSize);
          setPages(prev => prev.map((p, idx) => 
            idx === i ? { ...p, imageUrl: url, loading: false } : p
          ));
        } catch (err: any) {
          const errorMsg = err.message || '';
          if (errorMsg.includes("Requested entity was not found")) {
            // Reset key state and prompt again if we hit the "not found" error
            setApiKeyReady(false);
            setPages(prev => prev.map((p, idx) => 
              idx === i ? { ...p, loading: false, error: 'Pro key required. Please select a valid key.' } : p
            ));
            await setupApiKey();
            break; // Stop generation to let user fix key
          } else {
            setPages(prev => prev.map((p, idx) => 
              idx === i ? { ...p, loading: false, error: 'Failed to generate' } : p
            ));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    const validImages = pages.map(p => p.imageUrl).filter((url): url is string => !!url);
    if (validImages.length === 0) return;
    await createColoringBookPDF(childName, theme, validImages);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await getChatResponse(chatInput, []);
      setChatHistory(prev => [...prev, { role: 'model', text: response || 'No response' }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error connecting to Gemini.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-orange-400 p-3 rounded-2xl shadow-lg">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Magic Color Book</h1>
            <p className="text-slate-500 font-medium">Personalized AI-Generated Fun</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all border border-slate-100 font-semibold"
          >
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <span>Ask for Ideas</span>
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-4 bg-white p-8 rounded-3xl shadow-xl h-fit border border-slate-50 sticky top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            Book Settings
          </h2>
          
          <form onSubmit={handleStartGeneration} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Child's Name</label>
              <input 
                type="text" 
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g., Alex"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">What should we draw?</label>
              <textarea 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Space Dinosaurs playing soccer on Mars"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Image Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setImageSize(size)}
                    className={`relative py-2 px-3 rounded-lg border font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      imageSize === size 
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {size}
                    {(size === '2K' || size === '4K') && (
                      <Crown className={`w-3 h-3 ${imageSize === size ? 'text-white' : 'text-amber-400'}`} />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                {imageSize === '1K' ? 'Uses standard model (no key setup needed).' : 'Requires a selected billing-enabled API key.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                isGenerating 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-400 to-pink-500 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Magic Book
                </>
              )}
            </button>
          </form>

          {pages.some(p => p.imageUrl) && !isGenerating && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-4 rounded-2xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          )}
        </section>

        <section className="lg:col-span-8">
          {pages.length === 0 ? (
            <div className="h-[500px] flex flex-col items-center justify-center bg-white/50 rounded-3xl border-4 border-dashed border-white">
              <div className="bg-white p-6 rounded-full shadow-lg mb-4">
                <Printer className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Your magic book will appear here</h3>
              <p className="text-slate-400 text-sm mt-2">Enter a name and theme to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pages.map((page) => (
                <div key={page.id} className="bg-white p-4 rounded-3xl shadow-lg border border-slate-50 group overflow-hidden transition-all hover:shadow-2xl">
                  <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative flex items-center justify-center">
                    {page.loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating...</span>
                      </div>
                    ) : page.imageUrl ? (
                      <img 
                        src={page.imageUrl} 
                        alt={page.prompt}
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : (
                      <div className="text-red-400 text-xs text-center p-4 font-medium">
                        {page.error || 'Could not load image'}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 min-h-[2.5rem] italic">
                      "{page.prompt}"
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showChat && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[500px]">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-bold">Creative Assistant</span>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-[300px]">
              {chatHistory.length === 0 && (
                <div className="text-center py-10 px-6">
                  <p className="text-slate-500 text-sm">Hi! Not sure what to color? Ask me for some fun theme ideas like "animals in space"!</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-white rounded-tr-none shadow-md' 
                      : 'bg-white text-slate-700 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-none shadow-sm text-slate-400 text-xs animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
              />
              <button 
                type="submit"
                disabled={isChatLoading}
                className="bg-indigo-500 text-white p-2 rounded-full hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-20 text-center text-slate-400 pb-10">
        <p className="text-sm font-medium">Built with ❤️ for tiny artists everywhere.</p>
        <div className="flex justify-center gap-4 mt-4">
           <div className="w-2 h-2 rounded-full bg-orange-200"></div>
           <div className="w-2 h-2 rounded-full bg-indigo-200"></div>
           <div className="w-2 h-2 rounded-full bg-pink-200"></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
