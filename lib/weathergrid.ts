// Weather variables painted over the map: a grid of points around the site (Open-Meteo current conditions).
export const WEATHER_VARS = [
  { id: "temperature", name: "Temperature", param: "temperature_2m", unit: "°C", min: -10, max: 35, stops: ["#2c3e9e", "#3fa7d6", "#9fd8a8", "#f4d35e", "#ee6c4d", "#a4161a"] },
  { id: "uv", name: "UV index", param: "uv_index", unit: "", min: 0, max: 11, stops: ["#4caf50", "#cddc39", "#ffc107", "#ff7043", "#d32f2f", "#7b1fa2"] },
  { id: "wind", name: "Wind", param: "wind_speed_10m", unit: "km/h", min: 0, max: 70, stops: ["#e0f2f1", "#80cbc4", "#26a69a", "#ffb300", "#e64a19", "#6a1b9a"] },
  { id: "humidity", name: "Humidity", param: "relative_humidity_2m", unit: "%", min: 10, max: 100, stops: ["#a1662f", "#d9b26f", "#e9e3c9", "#8ecae6", "#219ebc", "#023047"] },
  { id: "rain", name: "Rain", param: "precipitation", unit: "mm", min: 0, max: 10, stops: ["#ffffff00", "#bde0fe", "#74c0fc", "#339af0", "#1864ab", "#5f3dc4"] },
  { id: "pressure", name: "Pressure", param: "surface_pressure", unit: "hPa", min: 940, max: 1030, stops: ["#5e548e", "#9f86c0", "#e0b1cb", "#f6bd60", "#f28482", "#84a59d"] },
  { id: "clouds", name: "Clouds", param: "cloud_cover", unit: "%", min: 0, max: 100, stops: ["#ffd16600", "#e9ecef", "#ced4da", "#adb5bd", "#6c757d", "#343a40"] },
] as const;
export type WeatherVarId = (typeof WEATHER_VARS)[number]["id"];

export type WeatherGrid = {
  simulado?: boolean;
  time: string;
  bounds: [[number, number], [number, number]]; // [[west, south], [east, north]]
  nx: number;
  ny: number;
  lats: number[]; // ny values, north → south
  lons: number[]; // nx values, west → east
  values: Record<string, (number | null)[]>; // per param, row-major (north row first)
  windDir: (number | null)[];
};
