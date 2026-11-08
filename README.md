# OpenChart Studio 📈

**OpenChart Studio** is an advanced, high-performance, open-source financial charting, order flow analysis, and quantitative trading workstation designed for quants, traders, and software engineers.

Built with **React 19**, **TypeScript**, **Lightweight Charts v5**, and **Tailwind CSS**, OpenChart Studio provides an ultra-fast desktop-class charting and market microstructure analysis experience running directly in modern web browsers.

---

## ✨ Features at a Glance

### 🔬 Order Flow & Volume Footprint Analysis
* **Volume Footprint Engine**: Real-time bid x ask order flow profile rendered on each bar with intra-bar volume distributions.
* **Point of Control (POC)**: Golden box highlight identifying the price level with the highest traded volume per candle.
* **Value Area (VAH / VAL)**: Automatic 70% intra-bar volume concentration boundaries.
* **Delta Profiling & Badges**: Color-coded net delta (Ask Volume - Bid Volume) badges positioned under each footprint bar.
* **Volume Imbalances**: Automatic visual highlighting of aggressive buy and sell imbalances (> 2.2x ratio).
* **3-Stage Dynamic Level of Detail (LOD)**:
  * **Macro View (< 12px)**: Sharp delta bodies with golden POC lines.
  * **Mid View (12px - 28px)**: Horizontal bid/ask volume distribution bars with POC boxes and delta badges.
  * **Micro View (≥ 28px)**: Full monospace bid x ask numerical values, imbalance alerts, and precision tier bars.
* **Volume Candles**: Dynamic volume-weighted candlestick widths scaled to rolling 20-bar volume with golden glow accents on volume spikes.

### 🐍 Python Scripting Engine & Quantitative IDE
* **In-Browser Python Editor**: Write, test, and execute custom quant indicators and strategies directly in Python without proprietary language lock-in.
* **Vectorized Math Operations**: High-performance execution with pre-built quantitative math modules (EMA, SMA, RSI, ATR, MACD, Bollinger Bands, etc.).
* **Dynamic Plotting & Signals**: Full support for custom `plot()`, horizontal levels `hline()`, and multi-plot subpane oscillators.
* **No Proprietary Vendor Lock-in**: Full ownership of your quantitative code without trademark or licensing restrictions.

### 🖥️ Multi-Pane Layouts & Synchronization
* **Multiple Chart Layouts**: 1 pane, 2 panes (horizontal/vertical), 3 panes, and 4-chart grids.
* **Unified Crosshair & Time Synchronization**: Cross-chart hover linking with synchronized crosshairs and time scales.
* **Cursor-Anchored Responsive Zoom**: Smooth, zero-lag mouse wheel zooming anchored exactly around the cursor's focal point.
* **Resizable UI Elements**: Smooth mouse-drag resizing for both the right watchlist sidebar and bottom indicator subpanes with persistent local storage.

### 📊 Multi-Asset Market Data & Symbol Search
* **80+ Pre-Configured Instruments**:
  * **Crypto**: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, AVAXUSDT, and more.
  * **BIST (Borsa İstanbul)**: THYAO, GARAN, EREGL, ASELS, SISE, KCHOL, BIMAS, AKBNK.
  * **Stocks (NASDAQ / NYSE)**: NVDA, AAPL, MSFT, TSLA, AMZN, GOOGL, SPY, QQQ.
  * **Forex**: EUR/USD, GBP/USD, USD/JPY, USD/TRY, AUD/USD.
  * **Commodities & Metals**: Gold (XAUUSD), Silver (XAGUSD), Brent Crude Oil, WTI, Copper.
  * **Indices**: S&P 500, Nasdaq 100, Dow Jones, BIST 100, DAX, FTSE 100.
* **Real-Time Data Feeds**: High-performance Binance WebSocket connection with automatic heartbeat, reconnect backoff, and synthetic fallback engine.

### 📰 Real-Time Macro Intelligence & Economic Calendar
* **Live News Feed**: Filterable financial news stream categorized by Crypto, Macro, Forex, and Stock markets.
* **Economic Calendar**: Scheduled macroeconomic releases with impact ratings (High, Medium, Low), actual, forecast, and previous readings.

### 🔔 Interactive Price Alerts on Chart
* **Visual On-Chart Alert Lines**: Interactive colored dashed price alert lines rendered directly on the chart canvas.
* **Quick (+) Scale Trigger**: Instant one-click alert and order creation right from the price scale.
* **Audio Notifications**: Immediate audio alerts with trigger event logging.

### 🧪 Quantitative Backtesting & Strategy Tester
* **Realistic Market Simulation**: Models maker/taker fees (0.05%), slippage (0.02%), and bar-by-bar execution.
* **Performance Metrics**: Net Profit, Win Rate, Profit Factor, Max Drawdown %, Total Closed Trades, Sharpe Ratio.
* **Equity Curve Visualization**: Interactive visual performance progression over time.

### 📝 Paper Trading (Simulated Execution)
* **Interactive Chart Trading**: Drag-and-drop Stop-Loss (SL) and Take-Profit (TP) lines directly on the chart canvas.
* **Order Book & Quick Buy/Sell Buttons**: Execute simulated Market and Limit orders in real time.
* **Position & Balance Tracking**: Local storage persistence with automatic real-time PnL tracking.

### 📐 Comprehensive Drawing Suite
* **Technical Drawing Tools**: Trendlines, Rays, Horizontal Lines, Fibonacci Retracements, Channels, Long/Short Risk-to-Reward Boxes, Measurement Rulers, and Freehand Brushes.
* **Fixed Range Volume Profile (FRVP)**: Calculate volume distributions over any user-selected time range.
* **Magnetic Snapping**: Automatically snaps drawing coordinates to bar Highs, Lows, Opens, and Closes.

### ⏰ Bar Replay Simulator
* **Market Replay**: Rewind historical market data to any past candle and step forward bar-by-bar or play automatically with adjustable speed.

### 🌐 Native Multilingual Internationalization (7 Languages)
* Full platform localization across the 7 most popular global trading languages:
  * 🇹🇷 **Türkçe** (Default)
  * 🇺🇸 **English**
  * 🇪🇸 **Español**
  * 🇩🇪 **Deutsch**
  * 🇫🇷 **Français**
  * 🇷🇺 **Русский**
  * 🇨🇳 **简体中文**
* **Instant Dynamic Switching**: Zero-latency O(1) in-memory dictionary access with persistent language preference storage (`openchart_language`).
* **100% Comprehensive Coverage**: Header menus, sidebars, indicator settings, drawing suite, all 10 modal dialogues, paper trading engine, and quantitative backtester.

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
* [Node.js](https://nodejs.org/) (version **18.0** or higher)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

### Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cagriKarakulak/openchart-studio.git
   cd openchart-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🛠️ Build for Production

To create an optimized, minified production build:

```bash
npm run build
```

The production assets will be output to the `dist/` folder. You can preview the production build locally with:

```bash
npm run preview
```

---

## 📂 Project Architecture

```
openchart-studio/
├── index.html                     # Application entry HTML
├── package.json                   # Project scripts and dependencies
├── tailwind.config.js             # Styling tokens and dark theme palette
├── vite.config.ts                 # Vite bundler configuration
└── src/
    ├── App.tsx                    # Core state management and layout orchestrator
    ├── main.tsx                   # React root entry point
    ├── components/
    │   ├── Header.tsx             # Symbol search, interval selectors, layout toggles
    │   ├── ChartPane.tsx          # High-performance canvas and Lightweight Charts renderer
    │   ├── SubPane.tsx            # Lower indicator subpanes (RSI, MACD, Volume)
    │   ├── LeftToolbar.tsx        # Technical drawing tools palette
    │   ├── BottomDock.tsx         # Python Editor, Strategy Tester, Paper Trading, Screener
    │   ├── RightSidebar.tsx       # Watchlist, Alerts, News & Calendar, Object Tree
    │   └── modals/                # Settings, layout, hotkey, and indicator dialogs
    ├── indicators/
    │   ├── math.ts                # Vectorized mathematical indicator formulas
    │   └── registry.ts            # Indicator presets and default configurations
    ├── services/
    │   ├── marketData.ts          # Binance WebSocket and REST feed engine
    │   ├── pythonEngine.ts        # In-browser Python quantitative script runtime
    │   ├── barProfileEngine.ts    # Order flow Volume Footprint & Volume Candles renderer
    │   ├── drawingRenderer.ts     # Technical drawings and canvas overlay engine
    │   ├── backtestEngine.ts      # Quantitative strategy backtesting engine
    │   ├── paperTradingService.ts # Local simulated trading account manager
    │   ├── newsCalendarService.ts # Financial news stream & economic calendar service
    │   └── storage.ts             # IndexedDB & LocalStorage persistence
    └── types/
        └── index.ts               # Complete TypeScript interfaces and types
```

---

## 📜 Keyboard Shortcuts (Hotkeys)

| Shortcut | Action |
| :--- | :--- |
| `A` - `Z` | Instant Symbol Search |
| `1`, `5`, `15`, `60`, `1D` | Quick Timeframe Change |
| `Ctrl + K` / `Cmd + K` | Quick Command Palette |
| `Ctrl + S` / `Cmd + S` | Quick Save Layout State |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo Drawing Action |
| `Shift + Click` | Instant Measure Ruler Tool |
| `Alt + H` | Open Hotkeys Cheat Sheet |
| `Alt + P` | Toggle Bottom Dock (Python / Strategy Editor) |
| `Alt + W` | Toggle Watchlist Sidebar |
| `Escape` | Reset to Crosshair / Close Active Modal |

---

## ⚖️ Legal Disclaimer

**OpenChart Studio** is an independent, community-driven open-source project created strictly for educational, research, and algorithmic trading development.

This project is **not** affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with **TradingView Inc.** or any of its subsidiaries or affiliates.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it for personal or commercial projects.
