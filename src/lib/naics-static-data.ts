/**
 * Static NAICS Data
 * This module contains a subset of NAICS codes for testing
 * We'll use this until the JSON import issue is resolved
 */

import type { NAICSCode } from '@/types/naics'

// Sample NAICS codes from the government data
export const staticNAICSCodes: NAICSCode[] = [
  // Agriculture codes
  {
    code: '111110',
    title: 'Soybean Farming',
    description: 'This industry comprises establishments primarily engaged in growing soybeans and/or producing soybean seeds.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Soybean Farming'
    }
  },
  {
    code: '111120',
    title: 'Oilseed (except Soybean) Farming',
    description: 'This industry comprises establishments primarily engaged in growing fibrous oilseed producing plants and/or producing oilseed seeds, such as sunflower, safflower, flax, rape, canola, and sesame.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Oilseed (except Soybean) Farming'
    }
  },
  {
    code: '111130',
    title: 'Dry Pea and Bean Farming',
    description: 'This industry comprises establishments primarily engaged in growing dry peas, beans, and/or lentils.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Dry Pea and Bean Farming'
    }
  },
  {
    code: '111140',
    title: 'Wheat Farming',
    description: 'This industry comprises establishments primarily engaged in growing wheat and/or producing wheat seeds.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Wheat Farming'
    }
  },
  {
    code: '111150',
    title: 'Corn Farming',
    description: 'This industry comprises establishments primarily engaged in growing corn (except sweet corn) and/or producing corn seeds.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Corn Farming'
    }
  },
  {
    code: '111160',
    title: 'Rice Farming',
    description: 'This industry comprises establishments primarily engaged in growing rice (except wild rice) and/or producing rice seeds.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Rice Farming'
    }
  },
  {
    code: '111191',
    title: 'Oilseed and Grain Combination Farming',
    description: 'This U.S. industry comprises establishments engaged in growing a combination of oilseed(s) and grain(s) with no one oilseed or grain accounting for one-half of the establishment\'s agricultural production.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Other Grain Farming'
    }
  },
  {
    code: '111199',
    title: 'All Other Grain Farming',
    description: 'This U.S. industry comprises establishments primarily engaged in growing grains and/or producing grain(s) seeds (except wheat, corn, rice, and oilseed(s) and grain(s) combinations).',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production',
      industryGroup: 'Oilseed and Grain Farming',
      industry: 'Other Grain Farming'
    }
  },
  // Mining codes
  {
    code: '211120',
    title: 'Crude Petroleum Extraction',
    description: 'This industry comprises establishments primarily engaged in the exploration, development, and/or the production of petroleum from wells.',
    level: 'nationalIndustry',
    sectorNumber: 21,
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction',
      subsector: 'Oil and Gas Extraction',
      industryGroup: 'Oil and Gas Extraction',
      industry: 'Crude Petroleum Extraction'
    }
  },
  {
    code: '211130',
    title: 'Natural Gas Extraction',
    description: 'This industry comprises establishments primarily engaged in the exploration, development, and/or the production of natural gas from wells.',
    level: 'nationalIndustry',
    sectorNumber: 21,
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction',
      subsector: 'Oil and Gas Extraction',
      industryGroup: 'Oil and Gas Extraction',
      industry: 'Natural Gas Extraction'
    }
  },
  {
    code: '212114',
    title: 'Surface Coal Mining',
    description: 'This U.S. industry comprises establishments primarily engaged in surface mining of bituminous coal, lignite, and anthracite coal.',
    level: 'nationalIndustry',
    sectorNumber: 21,
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction',
      subsector: 'Mining (except Oil and Gas)',
      industryGroup: 'Coal Mining',
      industry: 'Coal Mining'
    }
  },
  {
    code: '212115',
    title: 'Underground Coal Mining',
    description: 'This U.S. industry comprises establishments primarily engaged in underground mining of bituminous and anthracite coal.',
    level: 'nationalIndustry',
    sectorNumber: 21,
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction',
      subsector: 'Mining (except Oil and Gas)',
      industryGroup: 'Coal Mining',
      industry: 'Coal Mining'
    }
  },
  // Animal Production codes
  {
    code: '112111',
    title: 'Beef Cattle Ranching and Farming',
    description: 'This U.S. industry comprises establishments primarily engaged in raising cattle (including cattle for dairy herd replacements).',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Animal Production and Aquaculture',
      industryGroup: 'Cattle Ranching and Farming',
      industry: 'Beef Cattle Ranching and Farming, including Feedlots'
    }
  },
  {
    code: '112120',
    title: 'Dairy Cattle and Milk Production',
    description: 'This industry comprises establishments primarily engaged in milking dairy cattle.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Animal Production and Aquaculture',
      industryGroup: 'Cattle Ranching and Farming',
      industry: 'Dairy Cattle and Milk Production'
    }
  },
  {
    code: '112210',
    title: 'Hog and Pig Farming',
    description: 'This industry comprises establishments primarily engaged in raising hogs and pigs.',
    level: 'nationalIndustry',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Animal Production and Aquaculture',
      industryGroup: 'Hog and Pig Farming',
      industry: 'Hog and Pig Farming'
    }
  },
  // Add sector and subsector level codes too
  {
    code: '11',
    title: 'Agriculture, Forestry, Fishing and Hunting',
    description: 'The Agriculture, Forestry, Fishing and Hunting sector comprises establishments primarily engaged in growing crops, raising animals, harvesting timber, and harvesting fish and other animals from a farm, ranch, or their natural habitats.',
    level: 'sector',
    sectorNumber: 11,
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting'
    }
  },
  {
    code: '21',
    title: 'Mining, Quarrying, and Oil and Gas Extraction',
    description: 'The Mining, Quarrying, and Oil and Gas Extraction sector comprises establishments that extract naturally occurring mineral solids, such as coal and ores; liquid minerals, such as crude petroleum; and gases, such as natural gas.',
    level: 'sector',
    sectorNumber: 21,
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction'
    }
  },
  {
    code: '111',
    title: 'Crop Production',
    description: 'Industries in the Crop Production subsector grow crops mainly for food and fiber.',
    level: 'subsector',
    sectorNumber: 11,
    parentCode: '11',
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Crop Production'
    }
  },
  {
    code: '112',
    title: 'Animal Production and Aquaculture',
    description: 'Industries in the Animal Production and Aquaculture subsector raise or fatten animals for the sale of animals or animal products.',
    level: 'subsector',
    sectorNumber: 11,
    parentCode: '11',
    hierarchy: {
      sector: 'Agriculture, Forestry, Fishing and Hunting',
      subsector: 'Animal Production and Aquaculture'
    }
  },
  {
    code: '211',
    title: 'Oil and Gas Extraction',
    description: 'Industries in the Oil and Gas Extraction subsector operate and/or develop oil and gas field properties.',
    level: 'subsector',
    sectorNumber: 21,
    parentCode: '21',
    hierarchy: {
      sector: 'Mining, Quarrying, and Oil and Gas Extraction',
      subsector: 'Oil and Gas Extraction'
    }
  }
]

// Validate the data
import { validateNAICSCodes } from './validations/naics'

try {
  const validatedCodes = validateNAICSCodes(staticNAICSCodes)
  console.log(`[Static NAICS Data] Successfully validated ${validatedCodes.length} NAICS codes`)
} catch (error) {
  console.error('[Static NAICS Data] Validation failed:', error)
}

console.log(`[Static NAICS Data] Loaded ${staticNAICSCodes.length} NAICS codes`)