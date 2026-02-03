
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tile, ZoneType, CityStats, AdvisorMessage } from './types';
import { GRID_SIZE, INITIAL_MONEY, TICK_RATE, ZONE_COSTS, ZONE_COLORS, ZONE_ICONS, CHUNK_SIZE, SECTOR_PRICES, ZONE_INFO } from './constants';
const CITY_NAME_PREFIXES = [
  'Neo',
  'Aurora',
  'Iron',
  'Silver',
  'Verdant',
  'Nova',
  'Crystal',
  'Harbor',
  'Sunset',
  'Atlas',
];

const CITY_NAME_SUFFIXES = [
  'Haven',
  'Bay',
  'Heights',
  'Crossing',
  'Vale',
  'Point',
  'City',
  'Reach',
  'District',
  'Harbor',
];

const CITY_SAVE_LIST_KEY = 'skyline-city-saves-v1';

type SavedAdvisorMessage = Omit<AdvisorMessage, 'timestamp'> & {
  timestamp: string;
};

type CitySaveState = {
  version: 1;
  tiles: Tile[];
  stats: CityStats;
  unlockedChunks: string[];
  messages: SavedAdvisorMessage[];
  camera: {
    rotation: number;
    tilt: number;
    zoom: number;
    x: number;
    y: number;
  };
  ui: {
    showLeftPanel: boolean;
    showRightPanel: boolean;
    selectedTool: ZoneType;
    isPaused: boolean;
  };
};

type CitySaveEntry = {
  id: string;
  name: string;
  savedAt: string;
  data: CitySaveState;
};

const generateCityName = () => {
  const prefix = CITY_NAME_PREFIXES[Math.floor(Math.random() * CITY_NAME_PREFIXES.length)];
  const suffix = CITY_NAME_SUFFIXES[Math.floor(Math.random() * CITY_NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
};

const buildAdvisorMessage = (stats: CityStats, tiles: Tile[]) => {
  const counts = tiles.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lowHealth = stats.happiness < 40;
  const lowGold = stats.money < 1000;
  const powerShort = stats.resources.powerUsage > stats.resources.power;
  const waterShort = stats.resources.waterUsage > stats.resources.water;
  const sewageShort = stats.resources.sewageUsage > stats.resources.sewage;
  const pressureScore = [powerShort, waterShort, sewageShort, stats.netIncome < 0, lowHealth].filter(Boolean).length;
  const highEnemyPressure = pressureScore >= 3;
  const waveTransition = stats.day % 10 === 0;

  const sentences: string[] = [];

  if (waveTransition) {
    sentences.push(`Day ${stats.day} marks a new growth phase. Expect faster demands and higher strain on utilities.`);
  }

  if (lowHealth) {
    sentences.push('City morale is low. Add parks, services, or stabilize utilities to recover happiness.');
  }

  if (lowGold) {
    sentences.push('Treasury is thin. Expand revenue zones or reduce costly infrastructure for a few days.');
  }

  if (highEnemyPressure) {
    sentences.push('City pressure is high due to shortages or deficits. Resolve power, water, or sewage bottlenecks first.');
  }

  if (sentences.length === 0) {
    const pop = stats.population.toLocaleString();
    sentences.push(`Systems are stable. Population ${pop} and treasury are trending steady.`);
    if ((counts[ZoneType.PARK] || 0) === 0) {
      sentences.push('Consider adding green space to preserve long-term happiness.');
    } else {
      sentences.push('Maintain balance between residential growth and utility capacity.');
    }
  }

  return sentences.slice(0, 3).join(' ');
};

const App: React.FC = () => {
  // Game State
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [unlockedChunks, setUnlockedChunks] = useState<Set<string>>(new Set(['1-1']));
  
  // UI States
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempCityName, setTempCityName] = useState('');
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean; chunkId: string | null; cost: number } | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');

  const [stats, setStats] = useState<CityStats>({
    name: 'Loading...',
    money: INITIAL_MONEY,
    netIncome: 0,
    population: 0,
    happiness: 80,
    happinessDetails: ['Base Happiness (+80)'],
    demand: { residential: 50, commercial: 20, industrial: 10 },
    resources: { power: 0, water: 0, sewage: 0, powerUsage: 0, waterUsage: 0, sewageUsage: 0 },
    services: { police: 0, fire: 0, health: 0, education: 0 },
    day: 1
  });
  const [selectedTool, setSelectedTool] = useState<ZoneType>(ZoneType.ROAD);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  
  // Camera State - Defaulting to Top-Down 2D (No Tilt, No Rotation)
  const [cameraRotation, setCameraRotation] = useState(0);
  const [cameraTilt, setCameraTilt] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  // Interaction Refs
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const lastPinchDistance = useRef<number | null>(null);
  const [selectedMoveTileId, setSelectedMoveTileId] = useState<string | null>(null);

  const getChunkId = useCallback((x: number, y: number) => {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    return `${cx}-${cy}`;
  }, []);

  const initGrid = useCallback(() => {
    const initialTiles: Tile[] = [];
    // Terrain Generation Seeds
    const riverOffset = Math.random() * 100;
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let type = ZoneType.EMPTY;

        // Generate River: Sine wave flowing roughly horizontal through center
        const riverCenter = (Math.sin((x + riverOffset) / 5) * 2.5) + (GRID_SIZE / 2);
        if (Math.abs(y - riverCenter) < 1.3) {
            type = ZoneType.WATER;
        }

        // Generate Rocks: Random scattering, but avoid river
        if (type === ZoneType.EMPTY && Math.random() < 0.03) {
            type = ZoneType.ROCK;
        }

        initialTiles.push({
          id: `${x}-${y}`,
          x, y,
          type,
          level: 0,
          density: 0,
          isPowered: false,
          hasWater: false
        });
      }
    }
    setTiles(initialTiles);
  }, []);

  const restartGame = useCallback(() => {
    initGrid();
    const newName = generateCityName();
    setStats({
      name: newName,
      money: INITIAL_MONEY,
      netIncome: 0,
      population: 0,
      happiness: 80,
      happinessDetails: ['Base Happiness (+80)'],
      demand: { residential: 50, commercial: 20, industrial: 10 },
      resources: { power: 0, water: 0, sewage: 0, powerUsage: 0, waterUsage: 0, sewageUsage: 0 },
      services: { police: 0, fire: 0, health: 0, education: 0 },
      day: 1
    });
    setUnlockedChunks(new Set(['1-1']));
    setMessages([{
      id: 'restart',
      sender: 'System',
      text: `Game Restarted. Welcome, Mayor. A new city awaits your command.`,
      timestamp: new Date(),
      type: 'info'
    }]);
    setCameraRotation(0);
    setCameraTilt(0);
    setCameraZoom(1);
    setCameraX(0);
    setCameraY(0);
    setSelectedTool(ZoneType.ROAD);
    setShowRestartConfirm(false);
  }, [initGrid]);

  const readSavedCities = useCallback((): CitySaveEntry[] => {
    const raw = localStorage.getItem(CITY_SAVE_LIST_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CitySaveEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }, []);

  const writeSavedCities = useCallback((entries: CitySaveEntry[]) => {
    localStorage.setItem(CITY_SAVE_LIST_KEY, JSON.stringify(entries));
  }, []);

  const buildSavePayload = useCallback((): CitySaveState => ({
    version: 1,
    tiles,
    stats,
    unlockedChunks: Array.from(unlockedChunks),
    messages: messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    })),
    camera: {
      rotation: cameraRotation,
      tilt: cameraTilt,
      zoom: cameraZoom,
      x: cameraX,
      y: cameraY
    },
    ui: {
      showLeftPanel,
      showRightPanel,
      selectedTool,
      isPaused
    }
  }), [tiles, stats, unlockedChunks, messages, cameraRotation, cameraTilt, cameraZoom, cameraX, cameraY, showLeftPanel, showRightPanel, selectedTool, isPaused]);

  const saveCity = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = buildSavePayload();
    const entry: CitySaveEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      data: payload
    };
    const entries = readSavedCities();
    writeSavedCities([entry, ...entries]);
    setMessages(m => [{
      id: Date.now().toString(),
      sender: 'System',
      text: `City saved as “${trimmed}”.`,
      timestamp: new Date(),
      type: 'success'
    }, ...m]);
  }, [buildSavePayload, readSavedCities, writeSavedCities]);

  const applySavedState = useCallback((data: CitySaveState) => {
    setTiles(data.tiles);
    setStats(data.stats);
    setUnlockedChunks(new Set(data.unlockedChunks || ['1-1']));
    setCameraRotation(data.camera?.rotation ?? 0);
    setCameraTilt(data.camera?.tilt ?? 0);
    setCameraZoom(data.camera?.zoom ?? 1);
    setCameraX(data.camera?.x ?? 0);
    setCameraY(data.camera?.y ?? 0);
    setShowLeftPanel(data.ui?.showLeftPanel ?? true);
    setShowRightPanel(data.ui?.showRightPanel ?? true);
    setSelectedTool(data.ui?.selectedTool ?? ZoneType.ROAD);
    setIsPaused(data.ui?.isPaused ?? false);
    setSelectedMoveTileId(null);
    setPurchaseModal(null);
    setShowRestartConfirm(false);
    setIsEditingName(false);
    setTempCityName('');

    const restoredMessages = (data.messages || []).map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'System',
        text: 'City loaded from local storage.',
        timestamp: new Date(),
        type: 'success'
      },
      ...restoredMessages
    ]);
  }, []);

  const loadCityEntry = useCallback((entry: CitySaveEntry) => {
    if (!entry?.data) return;
    applySavedState(entry.data);
  }, [applySavedState]);

  const openSaveModal = useCallback(() => {
    setSaveNameInput(stats.name);
    setShowSaveModal(true);
  }, [stats.name]);

  const openLoadModal = useCallback(() => {
    setShowLoadModal(true);
  }, []);

  const startNewCity = useCallback(() => {
    restartGame();
    setIsPaused(false);
    setSelectedMoveTileId(null);
    setIsEditingName(false);
    setTempCityName('');
  }, [restartGame]);

  useEffect(() => {
    initGrid();
    setStats(s => ({ ...s, name: generateCityName() }));
    setMessages([{
      id: 'init',
      sender: 'System',
      text: `Welcome, Mayor. System ready. Zoning commercial and industrial blocks generates city revenue.`,
      timestamp: new Date(),
      type: 'info'
    }]);
  }, [initGrid]);

  // Simulation Loop - Adjusted Economy
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setStats(prev => {
        const counts = tiles.reduce((acc, t) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const pop = ((counts[ZoneType.RESIDENTIAL_LOW] || 0) * 10) + 
                    ((counts[ZoneType.RESIDENTIAL_MED] || 0) * 50) + 
                    ((counts[ZoneType.RESIDENTIAL_HIGH] || 0) * 200);
        
        const powerCap = (counts[ZoneType.POWER_PLANT] || 0) * 1000 + (counts[ZoneType.WIND_TURBINE] || 0) * 200;
        const waterCap = (counts[ZoneType.WATER_TOWER] || 0) * 500;
        const sewageCap = (counts[ZoneType.SEWAGE_PLANT] || 0) * 800;

        const powerUsage = (pop * 0.5) + ((counts[ZoneType.COMMERCIAL_LOW] || 0) * 20) + ((counts[ZoneType.INDUSTRIAL_LOW] || 0) * 50);
        const waterUsage = (pop * 0.4);
        const sewageUsage = (pop * 0.3);

        const tax = (pop * 1.5) + ((counts[ZoneType.COMMERCIAL_LOW] || 0) * 30) + ((counts[ZoneType.INDUSTRIAL_LOW] || 0) * 40);
        
        const maintenance = (counts[ZoneType.POWER_PLANT] || 0) * 100 + 
                            (counts[ZoneType.WIND_TURBINE] || 0) * 20 + 
                            (counts[ZoneType.WATER_TOWER] || 0) * 50 + 
                            (counts[ZoneType.ROAD] || 0) * 1 +
                            (counts[ZoneType.SEWAGE_PLANT] || 0) * 60;

        const income = Math.floor(tax - maintenance);

        // Happiness Calculation
        let happy = 70;
        const details = ["Base Happiness (+70)"];

        // Services Impact
        const parks = counts[ZoneType.PARK] || 0;
        if (parks > 0) {
            const bonus = Math.min(20, parks * 2);
            happy += bonus;
            details.push(`Parks & Recreation (+${bonus})`);
        }

        const police = counts[ZoneType.POLICE_STATION] || 0;
        if (police > 0 && pop > 100) {
            happy += 5;
            details.push("Police Coverage (+5)");
        }
        
        // Negative Impacts
        if (powerUsage > powerCap) { 
            happy -= 20; 
            details.push("Power Outages (-20)");
        }
        if (waterUsage > waterCap) { 
            happy -= 20; 
            details.push("Water Shortage (-20)");
        }
        if (sewageUsage > sewageCap) {
             happy -= 10;
             details.push("Sewage Overflow (-10)");
        }
        if (prev.money < 0) {
            happy -= 10;
            details.push("City Bankruptcy (-10)");
        }

        // Overcrowding (Simple logic)
        if (pop > 1000 && parks === 0) {
            happy -= 5;
            details.push("No Green Space (-5)");
        }

        return {
          ...prev,
          money: prev.money + income,
          netIncome: income,
          population: pop,
          happiness: Math.max(0, Math.min(100, happy)),
          happinessDetails: details,
          resources: {
            power: powerCap, powerUsage: Math.floor(powerUsage),
            water: waterCap, waterUsage: Math.floor(waterUsage),
            sewage: sewageCap, sewageUsage: Math.floor(sewageUsage)
          },
          day: prev.day + 1
        };
      });
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [isPaused, tiles]);

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setCameraX(prev => Math.min(Math.max(prev + dx, -2000), 2000));
      setCameraY(prev => Math.min(Math.max(prev + dy, -2000), 2000));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      dragDistance.current += Math.abs(dx) + Math.abs(dy);
    }
  }, []);

  const handleTouchMoveGlobal = useCallback((e: TouchEvent) => {
    if (!isPanning.current) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;
      setCameraX(prev => Math.min(Math.max(prev + dx, -2000), 2000));
      setCameraY(prev => Math.min(Math.max(prev + dy, -2000), 2000));
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (lastPinchDistance.current !== null) {
        const delta = currentDist - lastPinchDistance.current;
        setCameraZoom(prev => Math.min(Math.max(0.2, prev + delta * 0.01), 4));
      }
      lastPinchDistance.current = currentDist;
      dragDistance.current = 100;
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditingName) return; 
    isPanning.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    dragDistance.current = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditingName) return;
    isPanning.current = true;
    const touch = e.touches[0];
    lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    dragDistance.current = 0;
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastPinchDistance.current = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    }
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    lastPinchDistance.current = null;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMoveGlobal, handleTouchMoveGlobal]);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.15;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    setCameraZoom(prev => Math.min(Math.max(0.2, prev + delta), 4));
  };

  const handleTileClick = useCallback((id: string) => {
    if (isPanning.current && dragDistance.current > 10) return;
    
    setTiles(prev => {
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      const tile = prev[index];
      const chunkId = getChunkId(tile.x, tile.y);

      if (!unlockedChunks.has(chunkId)) {
        const cost = SECTOR_PRICES[chunkId] || 50000;
        setPurchaseModal({ isOpen: true, chunkId, cost });
        return prev;
      }

      // Prevent building on Water or Rocks
      if (tile.type === ZoneType.WATER || tile.type === ZoneType.ROCK) {
        setMessages(m => [{ id: Date.now().toString(), sender: 'System', text: "Cannot build on natural terrain.", timestamp: new Date(), type: 'warning' }, ...m]);
        return prev;
      }

      if (selectedTool === ZoneType.MOVE) {
        if (tile.type !== ZoneType.EMPTY) {
          setSelectedMoveTileId(id);
        }
        return prev;
      }

      const cost = ZONE_COSTS[selectedTool];
      if (stats.money < cost) {
        setMessages(m => [{ id: Date.now().toString(), sender: 'System', text: "Insufficient funds!", timestamp: new Date(), type: 'warning' }, ...m]);
        return prev;
      }

      if (tile.type === selectedTool) return prev;

      const newTiles = [...prev];
      newTiles[index] = { ...tile, type: selectedTool, level: 0 };
      setStats(s => ({ ...s, money: s.money - cost }));
      return newTiles;
    });
  }, [selectedTool, stats.money, unlockedChunks, getChunkId]);

  const handleRightClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (selectedTool === ZoneType.MOVE) {
        setSelectedMoveTileId(null);
        return;
    }
    setTiles(prev => {
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      const tile = prev[index];

      // Protect terrain from demolition
      if (tile.type === ZoneType.WATER || tile.type === ZoneType.ROCK) {
        return prev;
      }

      const newTiles = [...prev];
      newTiles[index] = { ...prev[index], type: ZoneType.EMPTY, level: 0 };
      return newTiles;
    });
  };

  const nudgeBuilding = useCallback((id: string, dx: number, dy: number) => {
    setTiles(prev => {
      const sourceIndex = prev.findIndex(t => t.id === id);
      if (sourceIndex === -1) return prev;
      const source = prev[sourceIndex];
      const targetX = source.x + dx;
      const targetY = source.y + dy;
      if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) return prev;
      const targetId = `${targetX}-${targetY}`;
      const targetIndex = prev.findIndex(t => t.id === targetId);
      if (targetIndex === -1) return prev;
      const target = prev[targetIndex];
      
      // Prevent moving onto terrain
      if (target.type === ZoneType.WATER || target.type === ZoneType.ROCK) {
        return prev;
      }

      const newTiles = [...prev];
      newTiles[sourceIndex] = { ...source, type: target.type, level: target.level };
      newTiles[targetIndex] = { ...target, type: source.type, level: source.level };
      setSelectedMoveTileId(targetId);
      return newTiles;
    });
  }, []);

  const resetCamera = () => {
    setCameraRotation(0);
    setCameraTilt(0);
    setCameraZoom(1);
    setCameraX(0);
    setCameraY(0);
  };

  const askAdvisor = () => {
    setIsAdvisorLoading(true);
    const advice = buildAdvisorMessage(stats, tiles);
    setMessages(prev => [{ id: Date.now().toString(), sender: 'Advisor', text: advice, timestamp: new Date(), type: 'info' }, ...prev]);
    setIsAdvisorLoading(false);
  };

  const buildInfo = ZONE_INFO[selectedTool];
  const showBuildInfo = ![ZoneType.EMPTY, ZoneType.MOVE, ZoneType.WATER, ZoneType.ROCK].includes(selectedTool);

  return (
    <div className={`flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden select-none 
      ${selectedTool === ZoneType.EMPTY ? 'cursor-crosshair' : 
        (selectedTool === ZoneType.MOVE ? 'cursor-pointer' : '')}`}>
      


      {/* RESTART CONFIRMATION */}
      {showRestartConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center border-4 border-red-600/50">
                        <i className="fas fa-redo-alt text-3xl text-red-500"></i>
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Restart Simulation?</h2>
                    <p className="text-slate-400 text-sm">Delete everything and build a new city from scratch?</p>
                    <div className="flex gap-2 w-full mt-2">
                        <button onClick={() => setShowRestartConfirm(false)} className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-slate-300">No, stay</button>
                        <button onClick={restartGame} className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-900/20">Yes, Restart</button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* SAVE CITY MODAL */}
      {showSaveModal && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-900/30 flex items-center justify-center border-4 border-emerald-600/50">
                  <i className="fas fa-save text-xl text-emerald-400"></i>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Save City</h2>
                  <p className="text-slate-400 text-xs">Name this save so you can load it later.</p>
                </div>
              </div>
              <input
                type="text"
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveCity(saveNameInput);
                    setShowSaveModal(false);
                  }
                  if (e.key === 'Escape') setShowSaveModal(false);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-100 text-sm font-bold w-full px-3 py-2 rounded outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 bg-slate-700 rounded-xl font-bold text-slate-300">Cancel</button>
                <button onClick={() => { saveCity(saveNameInput); setShowSaveModal(false); }} className="flex-1 py-2 bg-emerald-600 rounded-xl font-bold text-white shadow-lg shadow-emerald-900/20">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAD CITY MODAL */}
      {showLoadModal && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center border-4 border-blue-600/50">
                  <i className="fas fa-folder-open text-xl text-blue-400"></i>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Load City</h2>
                  <p className="text-slate-400 text-xs">Choose a saved city to load.</p>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                {readSavedCities().length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-6">No saved cities yet.</div>
                )}
                {readSavedCities().map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => { loadCityEntry(entry); setShowLoadModal(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-100">{entry.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(entry.savedAt).toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Treasury: ${entry.data.stats.money.toLocaleString()} • Population: {entry.data.stats.population.toLocaleString()} • Day {entry.data.stats.day}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowLoadModal(false)} className="flex-1 py-2 bg-slate-700 rounded-xl font-bold text-slate-300">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE MODAL */}
      {purchaseModal?.isOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center border-4 border-blue-600/50">
                        <i className="fas fa-map-marked-alt text-3xl text-blue-500"></i>
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Expand Territory?</h2>
                    <p className="text-slate-400 text-sm">Purchase this sector for <span className="text-green-400 font-bold">${purchaseModal.cost.toLocaleString()}</span>?</p>
                    <div className="flex gap-2 w-full mt-2">
                        <button onClick={() => setPurchaseModal(null)} className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-slate-300">Cancel</button>
                        <button onClick={() => {
                          if (stats.money >= (purchaseModal.cost)) {
                            setUnlockedChunks(prev => new Set([...prev, purchaseModal.chunkId!]));
                            setStats(s => ({ ...s, money: s.money - (purchaseModal.cost) }));
                            setPurchaseModal(null);
                          } else {
                            setMessages(m => [{ id: Date.now().toString(), sender: 'System', text: "Insufficient treasury funds!", timestamp: new Date(), type: 'warning' }, ...m]);
                          }
                        }} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20">Buy Sector</button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* Main UI Left */}
      <div className={`bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-2xl relative transition-all duration-300 ease-in-out overflow-hidden min-w-0 ${showLeftPanel ? 'w-80 p-4' : 'w-0 p-0 border-0'}`}>
        <div className="min-w-[18rem] h-full flex flex-col">
          <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 overflow-hidden">
                      {isEditingName ? (
                      <input autoFocus type="text" value={tempCityName} onChange={(e) => setTempCityName(e.target.value)}
                          onBlur={() => { if(tempCityName.trim()) setStats(s => ({...s, name: tempCityName})); setIsEditingName(false); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { if(tempCityName.trim()) setStats(s => ({...s, name: tempCityName})); setIsEditingName(false); } if (e.key === 'Escape') setIsEditingName(false); }}
                          className="bg-slate-900 border border-blue-500 text-blue-400 text-xl font-black uppercase tracking-tighter w-full px-2 py-1 rounded outline-none" />
                      ) : (
                      <h1 className="text-2xl font-black text-blue-400 tracking-tighter uppercase cursor-pointer truncate" onClick={() => { setTempCityName(stats.name); setIsEditingName(true); }}>{stats.name}</h1>
                      )}
                  </div>
                  <div className="flex gap-1">
                       <button onClick={() => setShowLeftPanel(false)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 flex items-center justify-center transition-all border border-slate-600 shadow-sm active:scale-95">
                           <i className="fas fa-chevron-left text-xs"></i>
                       </button>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600/50">Day: {stats.day}</span>
                  <span className={stats.netIncome >= 0 ? "text-green-500" : "text-red-500"}>{stats.netIncome >= 0 ? '▲' : '▼'} Economy</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={openSaveModal} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-600 shadow-sm active:scale-95">Save City</button>
                  <button onClick={openLoadModal} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-600 shadow-sm active:scale-95">Load City</button>
                  <button onClick={startNewCity} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-600 shadow-sm active:scale-95">New City</button>
              </div>
          </div>

          <div className="space-y-4 mb-6">
            <StatItem 
              label="Treasury" 
              value={`$${stats.money.toLocaleString()}`} 
              color="text-green-400" 
              icon="fa-vault" 
              subValue={`${stats.netIncome >= 0 ? '+' : ''}${stats.netIncome}/d`} 
              subColor={stats.netIncome >= 0 ? "text-green-500" : "text-red-500"} 
            />
            <StatItem 
              label="Population" 
              value={stats.population.toLocaleString()} 
              color="text-blue-300" 
              icon="fa-users" 
            />
            <StatItem 
              label="Happiness" 
              value={`${stats.happiness}%`} 
              color={stats.happiness > 70 ? "text-yellow-400" : "text-red-400"} 
              icon="fa-smile"
              details={stats.happinessDetails}
            />
          </div>

          <div className="mb-6 p-3 bg-slate-900/50 rounded-2xl border border-slate-700">
            <ProgressBar label="Power" current={stats.resources.powerUsage} max={stats.resources.power} color="bg-red-500" />
            <ProgressBar label="Water" current={stats.resources.waterUsage} max={stats.resources.water} color="bg-cyan-500" />
          </div>

          <div className="mb-6 p-3 bg-slate-900/50 rounded-2xl border border-slate-700">
            <div className="flex gap-2 h-16">
              <DemandBar label="R" val={stats.demand.residential} color="bg-green-500" />
              <DemandBar label="C" val={stats.demand.commercial} color="bg-blue-500" />
              <DemandBar label="I" val={stats.demand.industrial} color="bg-yellow-600" />
            </div>
          </div>

          {/* Zoning Tools List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <h3 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Construction</h3>
              <div className="grid grid-cols-4 gap-2 pb-4">
                  {Object.keys(ZONE_COSTS).map((type) => {
                      const zType = type as ZoneType;
                      if (zType === ZoneType.EMPTY || zType === ZoneType.MOVE || zType === ZoneType.WATER || zType === ZoneType.ROCK) return null;
                      return (
                          <button key={zType} onClick={() => setSelectedTool(zType)} 
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-90 ${selectedTool === zType ? 'bg-slate-700 border-white shadow-lg' : 'bg-slate-900/30 border-slate-700/50 hover:bg-slate-700/50'}`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${ZONE_COLORS[zType]}`}>{ZONE_ICONS[zType]}</div>
                              <span className="text-[7px] font-black text-slate-400 truncate w-full text-center">${ZONE_COSTS[zType]}</span>
                          </button>
                      );
                  })}
              </div>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}
        className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden" style={{ touchAction: 'none' }}>
        
        {/* Expand Buttons */}
        {!showLeftPanel && (
           <button onClick={() => setShowLeftPanel(true)} className="absolute top-4 left-4 z-50 w-10 h-10 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center shadow-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95">
               <i className="fas fa-chevron-right"></i>
           </button>
        )}
        {!showRightPanel && (
           <button onClick={() => setShowRightPanel(true)} className="absolute top-4 right-4 z-50 w-10 h-10 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center shadow-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95">
               <i className="fas fa-chevron-left"></i>
           </button>
        )}

        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
          <div className="flex items-center justify-center transition-transform duration-100 ease-out" style={{ perspective: '2000px', transformStyle: 'preserve-3d', transform: `translate(${cameraX}px, ${cameraY}px)` }}>
            <div className="grid gap-px bg-slate-700 border border-slate-700 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, transform: `rotateX(${cameraTilt}deg) rotateZ(${cameraRotation}deg) scale(${cameraZoom})`, transformStyle: 'preserve-3d' }}>
              {tiles.map(tile => (
                <div key={tile.id} onClick={() => handleTileClick(tile.id)} onContextMenu={(e) => handleRightClick(e, tile.id)}
                  className={`w-8 h-8 md:w-10 md:h-10 grid-tile flex items-center justify-center relative transition-colors duration-300 ${ZONE_COLORS[tile.type]} ${selectedMoveTileId === tile.id ? 'ring-4 ring-white z-20 shadow-xl' : ''}`}>
                  {!unlockedChunks.has(getChunkId(tile.x, tile.y)) && (
                    <div className="absolute inset-0 bg-black/80 opacity-50 flex flex-col items-center justify-center">
                        <i className="fas fa-lock text-[8px] text-white/20"></i>
                        {/* Only show price on approximately center tile of the chunk to avoid clutter */}
                        {tile.x % CHUNK_SIZE === 4 && tile.y % CHUNK_SIZE === 4 && (
                            <span className="absolute text-[4px] md:text-[6px] text-white font-black bg-black/70 px-1 rounded mt-4 pointer-events-none whitespace-nowrap z-10 border border-white/20 shadow-lg">
                                ${SECTOR_PRICES[getChunkId(tile.x, tile.y)]?.toLocaleString() || '???'}
                            </span>
                        )}
                    </div>
                  )}
                  <div className="flex items-center justify-center pointer-events-none" style={{ transform: `rotateZ(${-cameraRotation}deg) rotateX(${-cameraTilt}deg)` }}>
                    {ZONE_ICONS[tile.type]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-6 flex items-center gap-3 px-4 py-3 bg-slate-800/95 rounded-[1.5rem] border border-slate-600 shadow-2xl z-40">
             <button onClick={() => setIsPaused(!isPaused)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg active:scale-90 ${isPaused ? 'bg-green-600 text-white shadow-green-900/40' : 'bg-slate-700 text-slate-300'}`}>
                <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
              </button>
             <ToolButton type={ZoneType.EMPTY} active={selectedTool === ZoneType.EMPTY} onClick={() => { setSelectedTool(ZoneType.EMPTY); setSelectedMoveTileId(null); }} icon={<i className="fas fa-trash"></i>} color="bg-red-600" label="Demolish" />
             <ToolButton type={ZoneType.MOVE} active={selectedTool === ZoneType.MOVE} onClick={() => { setSelectedTool(ZoneType.MOVE); setSelectedMoveTileId(null); }} icon={<i className="fas fa-arrows-alt"></i>} color="bg-purple-600" label="Move" />
        </div>

        <div className="absolute bottom-8 right-6 flex flex-col gap-2 z-40">
           <button onClick={resetCamera} className="w-12 h-12 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center shadow-lg active:scale-95"><i className="fas fa-crosshairs"></i></button>
        </div>
      </div>

      {/* Advisor Right */}
      <div className={`bg-slate-800 border-l border-slate-700 flex flex-col z-10 transition-all duration-300 ease-in-out overflow-hidden min-w-0 ${showRightPanel ? 'w-80' : 'w-0 border-0'}`}>
        <div className="min-w-[18rem] h-full flex flex-col p-4 gap-4">
          <div className="flex flex-col bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden" style={{ height: '45dvh' }}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 backdrop-blur">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRightPanel(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700 text-slate-500 transition-colors">
                      <i className="fas fa-chevron-right text-[10px]"></i>
                  </button>
                  <h2 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><i className="fas fa-user-tie text-blue-400"></i> City Advisor</h2>
                </div>
                <button onClick={askAdvisor} disabled={isAdvisorLoading} className="text-[10px] bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full font-black uppercase tracking-tighter transition shadow-lg shadow-blue-900/40 disabled:opacity-50 active:scale-95">
                    {isAdvisorLoading ? 'Analysing...' : 'Request Brief'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`p-4 rounded-2xl text-sm border animate-fade-in shadow-sm ${msg.sender === 'Advisor' ? 'bg-blue-900/10 border-blue-800/50' : 'bg-slate-700/50 border-slate-600/50'}`}>
                        <p className="text-slate-200 text-xs leading-relaxed">{msg.text}</p>
                        <span className="text-[8px] text-slate-500 font-black uppercase mt-3 block tracking-widest">{msg.sender} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 italic text-center p-8 opacity-40">
                        <i className="fas fa-satellite-dish text-3xl mb-4"></i>
                        <p className="text-[10px] uppercase font-black tracking-widest">No reports received. Awaiting briefing request.</p>
                    </div>
                )}
            </div>
          </div>
          <div className="flex flex-col bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden" style={{ height: '45dvh' }}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 backdrop-blur">
              <div className="flex items-center gap-2">
                <i className="fas fa-info-circle text-emerald-400"></i>
                <h2 className="font-black text-xs uppercase tracking-widest">Build Information</h2>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Selected</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {showBuildInfo && buildInfo ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Name</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-base font-black text-slate-100">{buildInfo.name}</p>
                      <span className="text-[10px] font-black text-emerald-400">${ZONE_COSTS[selectedTool].toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Effects</p>
                    <ul className="mt-2 space-y-2">
                      {buildInfo.effects.map((effect, index) => (
                        <li key={index} className="text-xs text-slate-200 leading-relaxed">• {effect}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Tradeoffs</p>
                    <ul className="mt-2 space-y-2">
                      {buildInfo.tradeoffs.map((tradeoff, index) => (
                        <li key={index} className="text-xs text-slate-200 leading-relaxed">• {tradeoff}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Requirements</p>
                    <ul className="mt-2 space-y-2">
                      {buildInfo.requirements.map((requirement, index) => (
                        <li key={index} className="text-xs text-slate-200 leading-relaxed">• {requirement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 italic text-center p-8 opacity-60">
                  <i className="fas fa-layer-group text-3xl mb-4"></i>
                  <p className="text-[10px] uppercase font-black tracking-widest">Select a building to see details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-usable UI Components
const StatItem: React.FC<{ label: string, value: string, color: string, icon: string, subValue?: string, subColor?: string, details?: string[] }> = ({ label, value, color, icon, subValue, subColor, details }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
  <div className={`flex flex-col gap-2 bg-slate-900/30 p-3 rounded-2xl border border-white/5 shadow-sm hover:bg-slate-900/50 transition-colors ${details ? 'cursor-pointer' : ''}`} onClick={() => details && setIsOpen(!isOpen)}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-400 border border-slate-600"><i className={`fas ${icon}`}></i></div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
             <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{label}</p>
             {details && <i className={`fas fa-chevron-down text-[10px] text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>}
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-xl font-black ${color} tracking-tighter`}>{value}</p>
            {subValue && <span className={`text-[10px] font-bold ${subColor}`}>{subValue}</span>}
          </div>
        </div>
      </div>
      
      {/* Inline Details Accordion */}
      {details && isOpen && (
        <div className="pt-2 mt-1 border-t border-white/5 animate-fade-in">
            <h4 className="text-[9px] font-black uppercase text-slate-500 mb-2">Factors</h4>
            <ul className="space-y-1.5">
                {details.map((detail, i) => {
                    const isPositive = detail.includes('+');
                    return (
                        <li key={i} className={`text-[10px] font-bold flex justify-between ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{detail.split('(')[0]}</span>
                            <span className="opacity-70">{detail.match(/\((.*?)\)/)?.[0]}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
      )}
  </div>
)};

const ProgressBar: React.FC<{ label: string, current: number, max: number, color: string }> = ({ label, current, max, color }) => {
    const percent = Math.min(100, (current / (max || 1)) * 100);
    return (
        <div className="mb-3 last:mb-0">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5 px-1">
                <span className="text-slate-500">{label}</span>
                <span className={percent > 90 ? 'text-red-500' : 'text-slate-400'}>{current}/{max}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                <div className={`h-full ${color} rounded-full transition-all duration-500 shadow-sm`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

const DemandBar: React.FC<{ label: string, val: number, color: string }> = ({ label, val, color }) => (
    <div className="flex-1 flex flex-col items-center gap-2">
        <div className="w-full h-full bg-slate-900/50 rounded-xl relative overflow-hidden flex flex-col justify-end border border-white/5 p-0.5 shadow-inner">
            <div className={`w-full ${color} transition-all duration-700 rounded-lg`} style={{ height: `${val}%` }}></div>
        </div>
        <span className="text-[10px] font-black text-slate-600 tracking-tighter">{label}</span>
    </div>
);

const ToolButton: React.FC<{ type: ZoneType, active: boolean, onClick: () => void, icon: React.ReactNode, color: string, label: string }> = ({ active, onClick, icon, color, label }) => (
    <button onClick={onClick} className={`group relative flex flex-col items-center gap-1 transition-all active:scale-95 ${active ? 'scale-110' : 'opacity-80'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${color} border-2 ${active ? 'border-white ring-4 ring-white/10' : 'border-transparent'}`}>{icon}</div>
      <span className="absolute -top-12 bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl border border-slate-700 font-black uppercase tracking-tighter translate-y-2 group-hover:translate-y-0">{label}</span>
    </button>
);

export default App;
