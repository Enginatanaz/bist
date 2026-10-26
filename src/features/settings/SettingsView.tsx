import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { Settings, Shield, Server, CheckCircle2, Key, Info } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [providerMode, setProviderMode] = useState<string>('REAL');
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getSettings()
      .then(res => {
        setProviderMode(res.providerMode);
        setHasGeminiKey(res.hasGeminiKey);
      })
      .catch(() => {});
  }, []);

  const handleProviderSwitch = async (mode: 'REAL' | 'DEMO') => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await apiClient.updateSettings(mode);
      setProviderMode(mode);
      setStatusMsg(`Piyasa sağlayıcısı başarıyla ${mode === 'REAL' ? 'Gerçek BIST Feed' : 'Demo Test Sağlayıcısı'} olarak güncellendi.`);
    } catch {
      setStatusMsg('Sağlayıcı değiştirilirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          Sistem ve Veri Sağlayıcı Ayarları
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Veri kaynağı modları, Borsa İstanbul lisans gecikme parametreleri ve API yapılandırmaları.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Provider Selection (Rule 1 & Rule 1.2) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Piyasa Verisi Sağlayıcı Adaptörü Seçimi
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Kural 1 gereğince gerçek piyasa verisi ile test/demo verisi birbirinden kesin olarak ayrılmıştır.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Real Provider */}
          <div
            onClick={() => handleProviderSwitch('REAL')}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              providerMode === 'REAL'
                ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/40'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-100 text-xs">BIST Gerçek Piyasa Feed Motoru</span>
              {providerMode === 'REAL' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                  AKTİF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Borsa İstanbul Pay Piyasası sembolleri, resmi 15 dakika gecikmeli OHLCV mumları ve doğrulanmış gerçek fiyat verileri.
            </p>
            <div className="mt-3 text-[11px] font-mono text-emerald-400">
              Doğrulanmış 500+ BIST Hissesi · Kural 1 Tam Uyumlu
            </div>
          </div>

          {/* Demo Provider */}
          <div
            onClick={() => handleProviderSwitch('DEMO')}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              providerMode === 'DEMO'
                ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-100 text-xs">[DEMO / TEST KAYNAĞI] Simülasyon</span>
              {providerMode === 'DEMO' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                  AKTİF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ağ bağlantısının bulunmadığı veya izole birim testlerinin yürütüldüğü durumlar için etiketlenmiş simülasyon sağlayıcısı.
            </p>
            <div className="mt-3 text-[11px] font-mono text-amber-400">
              Açıkça Etiketli Test Ortamı
            </div>
          </div>
        </div>
      </div>

      {/* API Key & Security Notice (Rule 1.2 & Environment Constraints) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">API Anahtarları ve Güvenlik Yönetimi</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Güvenlik standartları gereğince üçüncü taraf API anahtarları asla istemci koduna (tarayıcı JavaScript paketine) veya genel depolara yazılmaz. Tüm harici veri bağlantıları ve yapay zekâ entegrasyonu sunucu tarafında (Node.js Express) güvenli ortam değişkenleri (<code className="font-mono text-emerald-400">process.env</code>) üzerinden yönetilmektedir.
        </p>

        <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1 text-slate-400">
          <div className="flex items-center justify-between">
            <span>Gemini Analitik Motoru (gemini-3.8-flash):</span>
            <span className="text-emerald-400 font-bold">
              {hasGeminiKey ? 'Bağlantı Hazır' : 'Otomatik Enjekte Edilecek'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Veri Gecikme Politikası:</span>
            <span className="text-slate-200">15 Dakika Gecikmeli (BIST Standart)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Önbellek TTL Süresi:</span>
            <span className="text-slate-200">120 Saniye (RAM Cache)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
