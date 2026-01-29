import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Moon, 
  Sun, 
  Sparkles, 
  Layers, 
  ShoppingBag, 
  Download, 
  X, 
  Wand2,
  Aperture
} from 'lucide-react';

/*
  SECURITY NOTE:
  - Do NOT embed long-lived or privileged API keys in client-side code.
  - Prefer creating a server-side endpoint (serverless function) that holds the API key
    and forwards requests to the Generative API. The client calls that endpoint.
  - For development only, you may use an env var (e.g., REACT_APP_GEMINI_KEY), but treat it as public.
*/
const apiKey = process.env.REACT_APP_GEMINI_KEY || ""; // fallback: empty string

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('product'); // 'product' or 'mixer'

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <nav className={`fixed w-full z-50 backdrop-blur-lg border-b transition-colors duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-blue-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-lg text-white">
                <Aperture size={24} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                Editor AI
              </span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle dark mode"
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-yellow-400' : 'hover:bg-blue-50 text-slate-600'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-center mb-10">
          <div className={`p-1 rounded-2xl flex shadow-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <button
              onClick={() => setActiveTab('product')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                activeTab === 'product'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-md'
                  : 'text-slate-500 hover:text-blue-500'
              }`}
            >
              <ShoppingBag size={18} />
              Foto Produk Maker
            </button>
            <button
              onClick={() => setActiveTab('mixer')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                activeTab === 'mixer'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-md'
                  : 'text-slate-500 hover:text-blue-500'
              }`}
            >
              <Layers size={18} />
              Image Mixer
            </button>
          </div>
        </div>

        <div className="animate-fade-in">
          {activeTab === 'product' ? <ProductMaker darkMode={darkMode} /> : <ImageMixer darkMode={darkMode} />}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `}</style>
      </main>
    </div>
  );
}

// --- Feature Component: Product Photo Maker ---
function ProductMaker({ darkMode }) {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    // Cleanup preview object URL when component unmounts or previewUrl changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = null;
      return;
    }

    // Validate type & size
    if (!file.type.startsWith('image/')) {
      setError('Tipe file tidak valid. Harap unggah gambar.');
      e.target.value = null;
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`Ukuran file terlalu besar (maks ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB).`);
      e.target.value = null;
      return;
    }

    // Revoke previous preview URL if any
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
    e.target.value = null; // allow reupload same file later
  };

  const setAutoPrompt = () => {
    setPrompt("Professional product photography, cinematic lighting, 4k resolution, bokeh background, minimalistic elegant stand, commercial quality.");
  };

  const handleGenerate = async () => {
    if (!image) {
      setError("Silakan unggah foto produk terlebih dahulu.");
      return;
    }
    if (!prompt) {
      setError("Silakan masukkan deskripsi atau gunakan prompt otomatis.");
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base64Image = await fileToBase64(image);
      // Use AbortController to allow cancellation on unmount
      const controller = new AbortController();
      abortRef.current = controller;

      // IMPORTANT: Prefer calling your own server endpoint here that holds the real API key.
      const generatedImage = await callGeminiAPI(prompt, [base64Image], controller.signal);
      setResult(generatedImage);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`p-6 rounded-3xl shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-50'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="text-blue-500" /> Unggah Produk
        </h2>
        
        <div className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
          darkMode ? 'border-slate-600 hover:border-blue-400 bg-slate-900/50' : 'border-blue-200 hover:border-blue-400 bg-blue-50/50'
        }`}>
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-2" />
              <button 
                onClick={() => { 
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setImage(null); 
                  setPreviewUrl(null); 
                }}
                aria-label="Remove uploaded image"
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
              <ImageIcon size={48} className="text-blue-400 mb-2" />
              <span className="text-sm text-slate-500">Klik untuk unggah foto</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium opacity-80">Instruksi Prompt</label>
            <button 
              onClick={setAutoPrompt}
              className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium"
            >
              <Wand2 size={12} /> Prompt Otomatis
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: Letakkan produk di atas meja kayu dengan pencahayaan matahari sore..."
            className={`w-full p-4 rounded-xl resize-none h-28 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              darkMode ? 'bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex justify-center items-center gap-2 ${
            loading 
              ? 'bg-slate-400 cursor-not-allowed text-white' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-blue-500/30'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Memproses AI...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate Foto Profesional
            </>
          )}
        </button>
        {error && <p className="mt-4 text-red-500 text-sm text-center px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
      </div>

      <ResultDisplay result={result} loading={loading} darkMode={darkMode} title="Hasil Foto Produk" />
    </div>
  );
}

// --- Feature Component: Image Mixer ---
function ImageMixer({ darkMode }) {
  const [images, setImages] = useState([]); // { file, url }
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    // Cleanup object URLs and abort on unmount
    return () => {
      images.forEach(img => img.url && URL.revokeObjectURL(img.url));
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      e.target.value = null;
      return;
    }

    if (images.length + files.length > 4) {
      setError("Maksimal 4 foto yang diperbolehkan.");
      e.target.value = null;
      return;
    }

    const validated = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Salah satu file bukan gambar. Hanya gambar diperbolehkan.');
        e.target.value = null;
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Salah satu file terlalu besar (maks ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB).`);
        e.target.value = null;
        return;
      }
      validated.push({ file, url: URL.createObjectURL(file) });
    }

    setImages(prev => [...prev, ...validated]);
    setError('');
    setResult(null);
    e.target.value = null; // allow reuploading same files later
  };

  const removeImage = (index) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMix = async () => {
    if (images.length < 2) {
      setError("Unggah minimal 2 foto untuk digabungkan.");
      return;
    }
    if (!prompt) {
      setError("Tulis instruksi penggabungan.");
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base64Images = await Promise.all(images.map(img => fileToBase64(img.file)));
      const controller = new AbortController();
      abortRef.current = controller;

      // IMPORTANT: Prefer calling your own server endpoint here that holds the real API key.
      const generatedImage = await callGeminiAPI(prompt, base64Images, controller.signal);
      setResult(generatedImage);
    } catch (err) {
      setError(err.message || "Gagal menggabungkan gambar.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`p-6 rounded-3xl shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-50'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Layers className="text-cyan-500" /> Mixer Gambar (2-4 Foto)
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {images.map((img, idx) => (
            <div key={`${img.url}-${idx}`} className="relative group rounded-xl overflow-hidden h-32 border border-slate-200 dark:border-slate-700">
              <img src={img.url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                aria-label={`Hapus gambar ${idx + 1}`}
                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          
          {images.length < 4 && (
             <label className={`cursor-pointer border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center transition-colors ${
               darkMode ? 'border-slate-600 hover:border-cyan-400 bg-slate-900/50' : 'border-blue-200 hover:border-cyan-400 bg-blue-50/50'
             }`}>
              <Upload size={24} className="text-cyan-400 mb-1" />
              <span className="text-xs text-slate-500">Tambah Foto</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
            </label>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium opacity-80">Instruksi Penggabungan</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: Gabungkan gaya artistik gambar pertama dengan komposisi gambar kedua menjadi poster futuristik..."
            className={`w-full p-4 rounded-xl resize-none h-28 focus:ring-2 focus:ring-cyan-500 outline-none transition-all ${
              darkMode ? 'bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <button
          onClick={handleMix}
          disabled={loading}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex justify-center items-center gap-2 ${
            loading 
              ? 'bg-slate-400 cursor-not-allowed text-white' 
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-cyan-500/30'
          }`}
        >
          {loading ? (
             <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Menggabungkan...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Gabungkan Foto
            </>
          )}
        </button>
        {error && <p className="mt-4 text-red-500 text-sm text-center px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
      </div>

      <ResultDisplay result={result} loading={loading} darkMode={darkMode} title="Hasil Penggabungan" />
    </div>
  );
}

// --- Reusable Result Component ---
function ResultDisplay({ result, loading, darkMode, title }) {
  const downloadImage = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `editor-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-6 rounded-3xl shadow-xl border flex flex-col h-full min-h-[500px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-50'}`}>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ImageIcon className="text-purple-500" /> {title}
      </h2>
      
      <div className={`flex-1 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all ${
        darkMode ? 'bg-slate-900' : 'bg-slate-100'
      }`}>
        {loading ? (
          <div className="text-center p-8 animate-pulse">
            <div className="w-24 h-24 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 animate-bounce"></div>
            <p className="text-slate-500 font-medium">Sedang meracik pixels...</p>
            <p className="text-xs text-slate-400 mt-2">Ini mungkin memakan waktu beberapa detik</p>
          </div>
        ) : result ? (
          <div className="relative group w-full h-full flex items-center justify-center bg-black/10">
            <img src={result} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button 
                onClick={downloadImage}
                className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-50 transform hover:scale-105 transition-all shadow-lg"
              >
                <Download size={20} /> Unduh HD
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 opacity-40">
            <div className="w-32 h-32 border-4 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Sparkles size={40} className="text-slate-400" />
            </div>
            <p className="font-medium text-lg">Belum ada hasil</p>
            <p className="text-sm">Hasil AI akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Utils & API Handler ---

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result;
        // If result is data URL (expected), strip the prefix
        const base64String = typeof result === 'string' ? result.split(',')[1] : null;
        resolve({
          mimeType: file.type,
          data: base64String
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca file lokal.'));
    };
    reader.readAsDataURL(file);
  });
};

/*
  callGeminiAPI(prompt, images, signal)

  - prompt: string
  - images: Array<{ mimeType, data }>  (returned by fileToBase64)
  - signal: optional AbortSignal to cancel the fetch.

  NOTE: This function expects the same shape you used before. In production:
    - Prefer sending the request to your own serverless endpoint that keeps the API key secret.
    - The server will call the Generative API and return the result to the client.

  The endpoint used here is the public generative language endpoint with a key query param.
  That is acceptable for quick prototyping but NOT secure for production.
*/
const callGeminiAPI = async (prompt, images, signal) => {
  // If you must call Google from client (not recommended), ensure apiKey is set
  if (!apiKey) {
    throw new Error("API key tidak ditemukan. Simpan kunci di server Anda dan panggil endpoint server tersebut dari klien.");
  }

  // NOTE: prefer routing to your own server endpoint instead:
  // const url = '/api/generate-image'; // your server endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${encodeURIComponent(apiKey)}`;

  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data
    }
  }));

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        ...imageParts
      ]
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      // Try parse JSON for detailed error, but fallback to text
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = `API Error: ${errorData.error.message}`;
        } else if (errorData?.message) {
          errorMessage = `API Error: ${errorData.message}`;
        }
      } catch (e) {
        const txt = await response.text().catch(() => '');
        if (txt) errorMessage += ` - ${txt.substring(0, 200)}`;
        else if (response.statusText) errorMessage += ` ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (candidate?.finishReason === 'SAFETY') {
      throw new Error("Gambar tidak dapat dibuat karena alasan keamanan (Safety Filter). Coba ganti prompt Anda dengan deskripsi yang lebih aman.");
    }

    const imagePart = parts?.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    } else {
      const textPart = parts?.find(p => p.text);
      if (textPart) {
          throw new Error(`AI merespon teks: "${textPart.text.substring(0, 200)}..."`);
      }
      throw new Error("Gagal menghasilkan gambar. Silakan coba lagi.");
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Permintaan dibatalkan.');
    }
    throw new Error(err.message || "Gagal menghubungi server AI.");
  }
};