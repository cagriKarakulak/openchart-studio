import { openDB, IDBPDatabase } from 'idb';
import { AppState, ChartPaneConfig, WatchlistItem, PriceAlert, DrawingElement, IndicatorTemplate } from '../types';
import { createDefaultIndicator } from '../indicators/registry';

const DB_NAME = 'OpenChartStudioDB';
const DB_VERSION = 1;
const STATE_STORE = 'app_state';
const LAYOUTS_STORE = 'saved_layouts';
const TEMPLATES_KEY = 'openchart_indicator_templates_v1';

export interface SavedLayout {
  id: string;
  name: string;
  updatedAt: number;
  state: AppState;
}

export const BUILTIN_TEMPLATES: IndicatorTemplate[] = [
  {
    id: 'tmpl_trend',
    name: 'Trend Takipçisi (EMA Ribbon & Supertrend)',
    description: 'EMA 20/50/200 ve Supertrend trend kırılım kombinasyonu',
    isBuiltin: true,
    indicators: [
      { ...createDefaultIndicator('EMA'), id: 'ind_ema_20', name: 'EMA 20', params: { period: 20 }, styles: { line: { color: '#00e676', lineWidth: 2 } } },
      { ...createDefaultIndicator('EMA'), id: 'ind_ema_50', name: 'EMA 50', params: { period: 50 }, styles: { line: { color: '#ff9800', lineWidth: 2 } } },
      { ...createDefaultIndicator('EMA'), id: 'ind_ema_200', name: 'EMA 200', params: { period: 200 }, styles: { line: { color: '#2962ff', lineWidth: 3 } } },
      { ...createDefaultIndicator('Supertrend'), id: 'ind_st_10_3' },
    ],
  },
  {
    id: 'tmpl_momentum',
    name: 'Momentum & Volatilite (RSI + MACD + Bollinger)',
    description: 'Bollinger Bantları, RSI ve MACD osilatör paketi',
    isBuiltin: true,
    indicators: [
      { ...createDefaultIndicator('BollingerBands'), id: 'ind_bb_20_2' },
      { ...createDefaultIndicator('RSI'), id: 'ind_rsi_14' },
      { ...createDefaultIndicator('MACD'), id: 'ind_macd_12_26_9' },
    ],
  },
  {
    id: 'tmpl_volume_profile',
    name: 'Hacim Profili & Kurumsal Likidite (VPVR + VWAP)',
    description: 'Görünür Aralık Hacim Profili (VPVR), VWAP ve Hacim',
    isBuiltin: true,
    indicators: [
      { ...createDefaultIndicator('Volume'), id: 'ind_vol' },
      { ...createDefaultIndicator('VWAP'), id: 'ind_vwap' },
      { ...createDefaultIndicator('VolumeProfile'), id: 'ind_vpvr' },
    ],
  },
  {
    id: 'tmpl_scalping',
    name: 'Hızlı Scalping & Salınım (SMA + Stoch + ATR)',
    description: 'SMA 9/21 kesişimleri, Stokastik ve volatilite filtresi',
    isBuiltin: true,
    indicators: [
      { ...createDefaultIndicator('SMA'), id: 'ind_sma_9', name: 'SMA 9', params: { period: 9 }, styles: { line: { color: '#00e5ff', lineWidth: 2 } } },
      { ...createDefaultIndicator('SMA'), id: 'ind_sma_21', name: 'SMA 21', params: { period: 21 }, styles: { line: { color: '#ff1744', lineWidth: 2 } } },
      { ...createDefaultIndicator('Stochastic'), id: 'ind_stoch_14_3_3' },
      { ...createDefaultIndicator('ATR'), id: 'ind_atr_14' },
    ],
  },
  {
    id: 'tmpl_ichimoku',
    name: 'Ichimoku Bulutu & Dönüş Sinyalleri',
    description: 'Ichimoku Kinko Hyo ve Parabolic SAR',
    isBuiltin: true,
    indicators: [
      { ...createDefaultIndicator('Ichimoku'), id: 'ind_ichimoku' },
      { ...createDefaultIndicator('ParabolicSAR'), id: 'ind_psar' },
    ],
  },
];

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', price: 92450.0, change24h: 2.45, high24h: 93100, low24h: 89900, volume24h: 42350 },
  { symbol: 'ETHUSDT', name: 'Ethereum', price: 3420.5, change24h: 1.82, high24h: 3480, low24h: 3340, volume24h: 185000 },
  { symbol: 'SOLUSDT', name: 'Solana', price: 215.3, change24h: 5.14, high24h: 220, low24h: 202, volume24h: 650000 },
  { symbol: 'BNBUSDT', name: 'BNB', price: 635.8, change24h: -0.65, high24h: 645, low24h: 628, volume24h: 45000 },
  { symbol: 'XRPUSDT', name: 'Ripple', price: 1.84, change24h: 8.35, high24h: 1.92, low24h: 1.68, volume24h: 9500000 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', price: 0.285, change24h: -1.2, high24h: 0.302, low24h: 0.274, volume24h: 12000000 },
  { symbol: 'AVAXUSDT', name: 'Avalanche', price: 36.4, change24h: 3.8, high24h: 37.8, low24h: 34.5, volume24h: 340000 },
  { symbol: 'LINKUSDT', name: 'Chainlink', price: 18.9, change24h: 4.12, high24h: 19.4, low24h: 17.8, volume24h: 180000 },
];

export function getDefaultPane(id: string = 'pane_1', symbol: string = 'BTCUSDT'): ChartPaneConfig {
  return {
    id,
    symbol,
    timeframe: '15m',
    chartType: 'candlestick',
    indicators: [
      createDefaultIndicator('Volume'),
      createDefaultIndicator('EMA'),
      createDefaultIndicator('RSI'),
    ],
    drawings: [],
  };
}

export const INITIAL_STATE: AppState = {
  activePaneId: 'pane_1',
  layout: '1x1',
  panes: [getDefaultPane('pane_1', 'BTCUSDT')],
  watchlist: DEFAULT_WATCHLIST,
  alerts: [],
  syncCrosshair: true,
  syncSymbol: false,
  syncTimeframe: false,
  magnetMode: false,
  theme: 'dark',
};

class StorageService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STATE_STORE)) {
            db.createObjectStore(STATE_STORE);
          }
          if (!db.objectStoreNames.contains(LAYOUTS_STORE)) {
            db.createObjectStore(LAYOUTS_STORE, { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  // Load complete state
  public async loadState(): Promise<AppState> {
    try {
      const db = await this.getDB();
      const saved = await db.get(STATE_STORE, 'current');
      if (saved) {
        return {
          ...INITIAL_STATE,
          ...saved,
          // Ensure at least 1 pane exists
          panes: saved.panes && saved.panes.length > 0 ? saved.panes : INITIAL_STATE.panes,
        };
      }
    } catch (e) {
      console.warn('Failed to load from IndexedDB, trying localStorage fallback', e);
      try {
        const local = localStorage.getItem('tv_pro_state');
        if (local) {
          return { ...INITIAL_STATE, ...JSON.parse(local) };
        }
      } catch (err) {
        console.error('LocalStorage load failed', err);
      }
    }
    return INITIAL_STATE;
  }

  // Save complete state
  public async saveState(state: AppState): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STATE_STORE, state, 'current');
      // Mirror in localStorage for fast synchronous bootstrap if needed
      localStorage.setItem('tv_pro_state', JSON.stringify({
        activePaneId: state.activePaneId,
        layout: state.layout,
        theme: state.theme,
        magnetMode: state.magnetMode,
      }));
    } catch (e) {
      console.warn('Failed to save to IndexedDB, fallback to localStorage', e);
      try {
        localStorage.setItem('tv_pro_state', JSON.stringify(state));
      } catch (err) {
        console.error('LocalStorage fallback save failed', err);
      }
    }
  }

  // Save named layout (e.g., "BTC Day Trade Setup")
  public async saveNamedLayout(name: string, state: AppState): Promise<SavedLayout> {
    const db = await this.getDB();
    const layout: SavedLayout = {
      id: `layout_${Date.now()}`,
      name,
      updatedAt: Date.now(),
      state,
    };
    await db.put(LAYOUTS_STORE, layout);
    return layout;
  }

  // List all saved layouts
  public async getSavedLayouts(): Promise<SavedLayout[]> {
    try {
      const db = await this.getDB();
      return await db.getAll(LAYOUTS_STORE);
    } catch (e) {
      console.error('Error fetching saved layouts', e);
      return [];
    }
  }

  // Delete a saved layout
  public async deleteNamedLayout(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(LAYOUTS_STORE, id);
  }

  // Get all templates (builtin + user saved)
  public getIndicatorTemplates(): IndicatorTemplate[] {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      const userTemplates: IndicatorTemplate[] = saved ? JSON.parse(saved) : [];
      return [...BUILTIN_TEMPLATES, ...userTemplates];
    } catch (_) {
      return BUILTIN_TEMPLATES;
    }
  }

  // Save new user template
  public saveIndicatorTemplate(name: string, indicators: any[]): IndicatorTemplate {
    const template: IndicatorTemplate = {
      id: `tmpl_${Date.now()}`,
      name,
      indicators: JSON.parse(JSON.stringify(indicators)),
      isBuiltin: false,
    };
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      const userTemplates: IndicatorTemplate[] = saved ? JSON.parse(saved) : [];
      userTemplates.push(template);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(userTemplates));
    } catch (e) {
      console.warn('Failed to save indicator template', e);
    }
    return template;
  }

  // Delete user template
  public deleteIndicatorTemplate(id: string): void {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      if (!saved) return;
      const userTemplates: IndicatorTemplate[] = JSON.parse(saved);
      const filtered = userTemplates.filter(t => t.id !== id);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete indicator template', e);
    }
  }

  // Export full backup as JSON file
  public exportBackupToFile(state: AppState) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `openchart_studio_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Import full backup from JSON file
  public async importBackupFromFile(file: File): Promise<AppState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.panes) {
            await this.saveState(parsed);
            resolve(parsed);
          } else {
            reject(new Error('Geçersiz dosya formatı'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsText(file);
    });
  }
}

export const storageService = new StorageService();

