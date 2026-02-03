
import React from 'react';
import { ZoneType } from './types';

export const GRID_SIZE = 30; // Increased to 30x30
export const CHUNK_SIZE = 10; // 10x10 chunks
export const INITIAL_MONEY = 150000;
export const TICK_RATE = 1000; // Speed up to 1 second per day for better flow

// Varied prices for different sectors
// 1-1 is the starting center (Cost 0/Owned)
export const SECTOR_PRICES: Record<string, number> = {
  '0-0': 75000,  // Corner (NW)
  '1-0': 25000,  // North - Cheap expansion
  '2-0': 75000,  // Corner (NE)
  '0-1': 40000,  // West
  '1-1': 0,      // Center (Start)
  '2-1': 40000,  // East
  '0-2': 90000,  // Corner (SW)
  '1-2': 25000,  // South - Cheap expansion
  '2-2': 120000, // Corner (SE) - Prime Real Estate
};

export const ZONE_COLORS: Record<ZoneType, string> = {
  [ZoneType.EMPTY]: 'bg-slate-800',
  [ZoneType.RESIDENTIAL_LOW]: 'bg-green-600',
  [ZoneType.RESIDENTIAL_MED]: 'bg-green-500',
  [ZoneType.RESIDENTIAL_HIGH]: 'bg-green-400',
  [ZoneType.COMMERCIAL_LOW]: 'bg-blue-600',
  [ZoneType.COMMERCIAL_MED]: 'bg-blue-500',
  [ZoneType.COMMERCIAL_HIGH]: 'bg-blue-400',
  [ZoneType.INDUSTRIAL_LOW]: 'bg-yellow-700',
  [ZoneType.INDUSTRIAL_MED]: 'bg-yellow-600',
  [ZoneType.INDUSTRIAL_HIGH]: 'bg-yellow-500',
  [ZoneType.ROAD]: 'bg-slate-600',
  [ZoneType.POWER_PLANT]: 'bg-orange-800',
  [ZoneType.WIND_TURBINE]: 'bg-sky-200',
  [ZoneType.WATER_TOWER]: 'bg-cyan-600',
  [ZoneType.SEWAGE_PLANT]: 'bg-amber-900',
  [ZoneType.POLICE_STATION]: 'bg-indigo-600',
  [ZoneType.FIRE_STATION]: 'bg-red-600',
  [ZoneType.HOSPITAL]: 'bg-rose-100',
  [ZoneType.SCHOOL]: 'bg-amber-600',
  [ZoneType.PARK]: 'bg-emerald-400',
  [ZoneType.MOVE]: 'bg-purple-600',
  [ZoneType.WATER]: 'bg-blue-800/80',
  [ZoneType.ROCK]: 'bg-stone-600',
};

export const ZONE_COSTS: Record<ZoneType, number> = {
  [ZoneType.EMPTY]: 0,
  [ZoneType.RESIDENTIAL_LOW]: 100,
  [ZoneType.RESIDENTIAL_MED]: 500,
  [ZoneType.RESIDENTIAL_HIGH]: 2500,
  [ZoneType.COMMERCIAL_LOW]: 200,
  [ZoneType.COMMERCIAL_MED]: 1000,
  [ZoneType.COMMERCIAL_HIGH]: 5000,
  [ZoneType.INDUSTRIAL_LOW]: 300,
  [ZoneType.INDUSTRIAL_MED]: 1500,
  [ZoneType.INDUSTRIAL_HIGH]: 7500,
  [ZoneType.ROAD]: 50,
  [ZoneType.POWER_PLANT]: 8000,
  [ZoneType.WIND_TURBINE]: 4000,
  [ZoneType.WATER_TOWER]: 3000,
  [ZoneType.SEWAGE_PLANT]: 5000,
  [ZoneType.POLICE_STATION]: 10000,
  [ZoneType.FIRE_STATION]: 10000,
  [ZoneType.HOSPITAL]: 15000,
  [ZoneType.SCHOOL]: 12000,
  [ZoneType.PARK]: 1500,
  [ZoneType.MOVE]: 0,
  [ZoneType.WATER]: 0,
  [ZoneType.ROCK]: 0,
};

export const ZONE_INFO: Record<ZoneType, {
  name: string;
  effects: string[];
  tradeoffs: string[];
  requirements: string[];
}> = {
  [ZoneType.EMPTY]: {
    name: 'Clear Land',
    effects: ['Removes existing structures to free space.'],
    tradeoffs: ['No refund on demolition.'],
    requirements: ['Cannot clear water or rock tiles.'],
  },
  [ZoneType.RESIDENTIAL_LOW]: {
    name: 'Low Density Housing',
    effects: ['Adds +10 population per tile.', 'Generates modest tax income.', 'Consumes power and water as population grows.'],
    tradeoffs: ['Low revenue per tile.', 'Sprawl increases utility load over time.'],
    requirements: ['Requires power and water coverage to avoid happiness penalties.'],
  },
  [ZoneType.RESIDENTIAL_MED]: {
    name: 'Medium Density Housing',
    effects: ['Adds +50 population per tile.', 'Generates stronger tax income than low density.'],
    tradeoffs: ['Higher utility demand.', 'More sensitive to utility shortages.'],
    requirements: ['Requires power and water coverage.', 'Plan for sewage capacity as population rises.'],
  },
  [ZoneType.RESIDENTIAL_HIGH]: {
    name: 'High Density Housing',
    effects: ['Adds +200 population per tile.', 'High tax output per tile.'],
    tradeoffs: ['Very high utility demand.', 'Large happiness drops if utilities fail.'],
    requirements: ['Strong power and water supply.', 'Adequate sewage capacity and parks recommended.'],
  },
  [ZoneType.COMMERCIAL_LOW]: {
    name: 'Low Density Commerce',
    effects: ['Generates +30 tax income per tile.', 'Adds local jobs and minor power usage.'],
    tradeoffs: ['Low income compared to denser options.'],
    requirements: ['Requires power supply to operate efficiently.'],
  },
  [ZoneType.COMMERCIAL_MED]: {
    name: 'Medium Density Commerce',
    effects: ['Generates +30 tax income per tile.', 'Supports growing neighborhoods.'],
    tradeoffs: ['Higher utility draw.', 'More maintenance pressure through population growth.'],
    requirements: ['Requires power coverage.', 'Works best near residential zones.'],
  },
  [ZoneType.COMMERCIAL_HIGH]: {
    name: 'High Density Commerce',
    effects: ['Generates +30 tax income per tile.', 'High economic output per footprint.'],
    tradeoffs: ['Heavy power usage.', 'Happiness drops when utilities are strained.'],
    requirements: ['Reliable power supply.', 'Balance with industrial zones for stability.'],
  },
  [ZoneType.INDUSTRIAL_LOW]: {
    name: 'Light Industry',
    effects: ['Generates +40 tax income per tile.', 'Provides jobs and economic stability.'],
    tradeoffs: ['High power usage.', 'Adds utility strain quickly.'],
    requirements: ['Requires strong power supply.'],
  },
  [ZoneType.INDUSTRIAL_MED]: {
    name: 'Medium Industry',
    effects: ['Generates +40 tax income per tile.', 'Boosts revenue for growing cities.'],
    tradeoffs: ['Very high power usage.', 'Can tip utilities into shortage.'],
    requirements: ['Adequate power capacity before expansion.'],
  },
  [ZoneType.INDUSTRIAL_HIGH]: {
    name: 'Heavy Industry',
    effects: ['Generates +40 tax income per tile.', 'Maximizes revenue per tile.'],
    tradeoffs: ['Extremely high power usage.', 'Risk of outages if supply lags.'],
    requirements: ['Strong power infrastructure.', 'Balance with residential happiness.'],
  },
  [ZoneType.ROAD]: {
    name: 'Road',
    effects: ['Provides basic connectivity and layout control.'],
    tradeoffs: ['Small maintenance cost per tile.'],
    requirements: ['Cannot be placed on water or rock.'],
  },
  [ZoneType.POWER_PLANT]: {
    name: 'Power Plant',
    effects: ['Adds +1000 power capacity.'],
    tradeoffs: ['High upkeep cost.', 'Consumes budget if overbuilt.'],
    requirements: ['Best built before expanding dense zones.'],
  },
  [ZoneType.WIND_TURBINE]: {
    name: 'Wind Turbine',
    effects: ['Adds +200 power capacity.'],
    tradeoffs: ['Lower output than power plants.'],
    requirements: ['Use to supplement early power demand.'],
  },
  [ZoneType.WATER_TOWER]: {
    name: 'Water Tower',
    effects: ['Adds +500 water capacity.'],
    tradeoffs: ['Moderate upkeep.'],
    requirements: ['Required to avoid water shortages.'],
  },
  [ZoneType.SEWAGE_PLANT]: {
    name: 'Sewage Plant',
    effects: ['Adds +800 sewage capacity.'],
    tradeoffs: ['Ongoing upkeep cost.'],
    requirements: ['Expand as population grows to avoid overflow penalties.'],
  },
  [ZoneType.POLICE_STATION]: {
    name: 'Police Station',
    effects: ['Improves city safety once population exceeds 100.', 'Adds +5 happiness when active.'],
    tradeoffs: ['High upfront cost.'],
    requirements: ['Most effective after early growth.'],
  },
  [ZoneType.FIRE_STATION]: {
    name: 'Fire Station',
    effects: ['Improves emergency coverage (future systems ready).'],
    tradeoffs: ['High upfront cost.'],
    requirements: ['Place to prepare for larger city footprints.'],
  },
  [ZoneType.HOSPITAL]: {
    name: 'Hospital',
    effects: ['Improves health coverage (future systems ready).'],
    tradeoffs: ['High upfront cost.'],
    requirements: ['Best when population is expanding quickly.'],
  },
  [ZoneType.SCHOOL]: {
    name: 'School',
    effects: ['Improves education coverage (future systems ready).'],
    tradeoffs: ['High upfront cost.'],
    requirements: ['Place near residential zones to plan ahead.'],
  },
  [ZoneType.PARK]: {
    name: 'Park',
    effects: ['Adds +2 happiness per park, up to +20.', 'Boosts morale and livability.'],
    tradeoffs: ['No direct revenue.', 'Consumes space.'],
    requirements: ['Especially useful when population exceeds 1000.'],
  },
  [ZoneType.MOVE]: {
    name: 'Move Tool',
    effects: ['Swap the selected building with an adjacent tile.'],
    tradeoffs: ['No cost but requires manual repositioning.'],
    requirements: ['Cannot move onto water or rock.'],
  },
  [ZoneType.WATER]: {
    name: 'Water (Terrain)',
    effects: ['Natural terrain.'],
    tradeoffs: ['Cannot build here.'],
    requirements: ['None.'],
  },
  [ZoneType.ROCK]: {
    name: 'Rock (Terrain)',
    effects: ['Natural terrain.'],
    tradeoffs: ['Cannot build here.'],
    requirements: ['None.'],
  },
};

export const ZONE_ICONS: Record<ZoneType, React.ReactNode> = {
  [ZoneType.EMPTY]: null,
  [ZoneType.RESIDENTIAL_LOW]: <i className="fas fa-home text-white text-[10px] opacity-70"></i>,
  [ZoneType.RESIDENTIAL_MED]: <div className="flex gap-0.5"><i className="fas fa-home text-white text-[10px]"></i><i className="fas fa-home text-white text-[10px]"></i></div>,
  [ZoneType.RESIDENTIAL_HIGH]: <i className="fas fa-city text-white text-xs"></i>,
  [ZoneType.COMMERCIAL_LOW]: <i className="fas fa-store text-white text-[10px] opacity-70"></i>,
  [ZoneType.COMMERCIAL_MED]: <div className="flex gap-0.5"><i className="fas fa-store text-white text-[10px]"></i><i className="fas fa-store text-white text-[10px]"></i></div>,
  [ZoneType.COMMERCIAL_HIGH]: <i className="fas fa-building text-white text-xs"></i>,
  [ZoneType.INDUSTRIAL_LOW]: <i className="fas fa-industry text-white text-[10px] opacity-70"></i>,
  [ZoneType.INDUSTRIAL_MED]: <div className="flex gap-0.5"><i className="fas fa-industry text-white text-[10px]"></i><i className="fas fa-industry text-white text-[10px]"></i></div>,
  [ZoneType.INDUSTRIAL_HIGH]: <i className="fas fa-factory text-white text-xs"></i>,
  [ZoneType.ROAD]: <div className="w-full h-full flex items-center justify-center"><div className="w-1 h-3/4 border-l-2 border-dashed border-slate-400/30"></div></div>,
  [ZoneType.POWER_PLANT]: <i className="fas fa-smog text-white text-xs"></i>,
  [ZoneType.WIND_TURBINE]: <i className="fas fa-fan text-slate-600 text-xs animate-spin-slow"></i>,
  [ZoneType.WATER_TOWER]: <i className="fas fa-tint text-white text-xs"></i>,
  [ZoneType.SEWAGE_PLANT]: <i className="fas fa-poop text-white text-xs"></i>,
  [ZoneType.POLICE_STATION]: <i className="fas fa-shield-alt text-white text-xs"></i>,
  [ZoneType.FIRE_STATION]: <i className="fas fa-fire-extinguisher text-white text-xs"></i>,
  [ZoneType.HOSPITAL]: <i className="fas fa-plus text-red-500 text-xs"></i>,
  [ZoneType.SCHOOL]: <i className="fas fa-graduation-cap text-white text-xs"></i>,
  [ZoneType.PARK]: <i className="fas fa-tree text-white text-xs"></i>,
  [ZoneType.MOVE]: <i className="fas fa-arrows-alt text-white text-xs"></i>,
  [ZoneType.WATER]: <div className="w-full h-full bg-blue-500/20 animate-pulse"><i className="fas fa-water text-blue-300 text-[10px] opacity-50 absolute inset-0 m-auto"></i></div>,
  [ZoneType.ROCK]: <i className="fas fa-mountain text-stone-400 text-xs"></i>,
};
