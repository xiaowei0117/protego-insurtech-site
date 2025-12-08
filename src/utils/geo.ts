// src/utils/geo.ts

/* ------------------------------------------------
   全部 50 州 + DC（用于 State 下拉菜单）
-------------------------------------------------- */
export const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
];

/* ------------------------------------------------
   ZIP 区间表（USPS 官方参考）
   用于 ZIP 校验
-------------------------------------------------- */
export const ZIP_RANGES: Record<
  string,
  { min: number; max: number }
> = {
  AL: { min: 35000, max: 36999 },
  AK: { min: 99500, max: 99999 },
  AZ: { min: 85000, max: 86999 },
  AR: { min: 71600, max: 72999 },
  CA: { min: 90000, max: 96199 },
  CO: { min: 80000, max: 81699 },
  CT: { min: 6000, max: 6999 },
  DE: { min: 19700, max: 19999 },
  FL: { min: 32000, max: 34999 },
  GA: { min: 30000, max: 31999 },
  HI: { min: 96700, max: 96899 },
  ID: { min: 83200, max: 83999 },
  IL: { min: 60000, max: 62999 },
  IN: { min: 46000, max: 47999 },
  IA: { min: 50000, max: 52899 },
  KS: { min: 66000, max: 67999 },
  KY: { min: 40000, max: 42799 },
  LA: { min: 70000, max: 71599 },
  ME: { min: 3900, max: 4999 },
  MD: { min: 20600, max: 21999 },
  MA: { min: 1000, max: 2799 },
  MI: { min: 48000, max: 49999 },
  MN: { min: 55000, max: 56799 },
  MS: { min: 38600, max: 39799 },
  MO: { min: 63000, max: 65899 },
  MT: { min: 59000, max: 59999 },
  NE: { min: 68000, max: 69399 },
  NV: { min: 88900, max: 89899 },
  NH: { min: 3000, max: 3899 },
  NJ: { min: 7000, max: 8999 },
  NM: { min: 87000, max: 88499 },
  NY: { min: 10000, max: 14999 },
  NC: { min: 27000, max: 28999 },
  ND: { min: 58000, max: 58899 },
  OH: { min: 43000, max: 45999 },
  OK: { min: 73000, max: 74999 },
  OR: { min: 97000, max: 97999 },
  PA: { min: 15000, max: 19699 },
  RI: { min: 2800, max: 2999 },
  SC: { min: 29000, max: 29999 },
  SD: { min: 57000, max: 57799 },
  TN: { min: 37000, max: 38599 },
  TX: { min: 75000, max: 79999 },
  UT: { min: 84000, max: 84799 },
  VT: { min: 5000, max: 5999 },
  VA: { min: 20100, max: 24699 },
  WA: { min: 98000, max: 99499 },
  WV: { min: 24700, max: 26899 },
  WI: { min: 53000, max: 54999 },
  WY: { min: 82000, max: 83199 },
  DC: { min: 20000, max: 20099 },
};

/* ------------------------------------------------
   ZIP 校验函数
   返回：string | null
   - null = 无错误
   - string = 错误信息
-------------------------------------------------- */
export function validateZip(state: string, zip: string): string | null {
  if (!state) return "Please select a state first.";
  if (!zip) return "Zip code is required.";
  if (!/^\d{5}$/.test(zip)) return "Zip code must be 5 digits.";

  const range = ZIP_RANGES[state];
  if (!range) return null; // 若没有配置，默认通过

  const zipNum = Number(zip);

  if (zipNum < range.min || zipNum > range.max) {
    return `ZIP does not match ${state} (${range.min}–${range.max}).`;
  }

  return null;
}
