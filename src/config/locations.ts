// Centralized location configuration
// Update these values to change location names throughout the application

// Location codes (used internally as keys)
export const LOCATIONS = {
  BOS: 'BOS',
  LGA: 'LGA',
  DCA: 'DCA',
  ORD: 'ORD'
} as const;

// Display names for locations
export const LOCATION_NAMES: Record<string, string> = {
  [LOCATIONS.BOS]: '12 Main Lower Level',
  [LOCATIONS.LGA]: '12 Main Upper Level',
  [LOCATIONS.DCA]: 'The Spouter Inn',
  [LOCATIONS.ORD]: 'Waterfront'
};

export interface LocationRegion {
  name: string;
  locations: string[];
}

// Regions group locations hierarchically
export const LOCATION_REGIONS: LocationRegion[] = [
  {
    name: 'Lenox Mall',
    locations: [LOCATIONS.BOS, LOCATIONS.LGA]
  },
  {
    name: 'New Bedford, MA',
    locations: [LOCATIONS.DCA, LOCATIONS.ORD]
  }
];

export const LOCATION_LIST = Object.values(LOCATIONS);

export type LocationCode = typeof LOCATIONS[keyof typeof LOCATIONS];

// Helper to get region name for a location
export const getLocationRegion = (locationCode: string): string | undefined => {
  return LOCATION_REGIONS.find(region => region.locations.includes(locationCode))?.name;
};

// Helper to get display name for a location code
export const getLocationName = (locationCode: string): string => {
  return LOCATION_NAMES[locationCode] || locationCode;
};

// Helper to check if a set of locations represents a complete region
export const isCompleteRegion = (locationCodes: string[]): LocationRegion | undefined => {
  return LOCATION_REGIONS.find(region =>
    region.locations.length === locationCodes.length &&
    region.locations.every(loc => locationCodes.includes(loc))
  );
};

// Format location codes as a display string with region grouping when applicable
export const formatLocations = (locationCodes: string[], showIndividualNames = true): string => {
  if (locationCodes.length === 0) return '';

  const formattedParts: string[] = [];
  const usedLocations = new Set<string>();

  // First, check for complete regions
  for (const region of LOCATION_REGIONS) {
    const hasAllLocations = region.locations.every(loc => locationCodes.includes(loc));
    if (hasAllLocations) {
      if (showIndividualNames) {
        // Show region name with individual location names in parentheses
        const locationNames = region.locations.map(loc => getLocationName(loc)).join(', ');
        formattedParts.push(`${region.name} (${locationNames})`);
      } else {
        formattedParts.push(region.name);
      }
      region.locations.forEach(loc => usedLocations.add(loc));
    }
  }

  // Then add individual locations that aren't part of complete regions
  for (const loc of locationCodes) {
    if (!usedLocations.has(loc)) {
      formattedParts.push(getLocationName(loc));
    }
  }

  return formattedParts.join(', ');
};
