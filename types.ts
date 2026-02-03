
export enum ZoneType {
  EMPTY = 'EMPTY',
  RESIDENTIAL_LOW = 'RESIDENTIAL_LOW',
  RESIDENTIAL_MED = 'RESIDENTIAL_MED',
  RESIDENTIAL_HIGH = 'RESIDENTIAL_HIGH',
  COMMERCIAL_LOW = 'COMMERCIAL_LOW',
  COMMERCIAL_MED = 'COMMERCIAL_MED',
  COMMERCIAL_HIGH = 'COMMERCIAL_HIGH',
  INDUSTRIAL_LOW = 'INDUSTRIAL_LOW',
  INDUSTRIAL_MED = 'INDUSTRIAL_MED',
  INDUSTRIAL_HIGH = 'INDUSTRIAL_HIGH',
  ROAD = 'ROAD',
  POWER_PLANT = 'POWER_PLANT',
  WIND_TURBINE = 'WIND_TURBINE',
  WATER_TOWER = 'WATER_TOWER',
  SEWAGE_PLANT = 'SEWAGE_PLANT',
  POLICE_STATION = 'POLICE_STATION',
  FIRE_STATION = 'FIRE_STATION',
  HOSPITAL = 'HOSPITAL',
  SCHOOL = 'SCHOOL',
  PARK = 'PARK',
  MOVE = 'MOVE',
  WATER = 'WATER',
  ROCK = 'ROCK'
}

export interface Tile {
  id: string;
  x: number;
  y: number;
  type: ZoneType;
  level: number; // 0-3 for growth
  density: number; // For simulation
  isPowered: boolean;
  hasWater: boolean;
}

export interface CityStats {
  name: string;
  money: number;
  netIncome: number; // Cash flow per tick
  population: number;
  happiness: number;
  happinessDetails: string[]; // Reasons for current happiness score
  demand: {
    residential: number;
    commercial: number;
    industrial: number;
  };
  resources: {
    power: number; // Capacity
    water: number; // Capacity
    sewage: number; // Capacity
    powerUsage: number;
    waterUsage: number;
    sewageUsage: number;
  };
  services: {
    police: number; // Coverage %
    fire: number;   // Coverage %
    health: number; // Coverage %
    education: number; // Coverage %
  };
  day: number;
}

export interface AdvisorMessage {
  id: string;
  sender: 'Advisor' | 'System';
  text: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'success';
}
