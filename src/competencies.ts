// Competency and Service Types
export interface CompetencyKeyword {
  value: string;
  weight?: number;
}

export interface Competency {
  pscCode: string;
  name: string;
  title?: string;
  keywords: string[];
  description: string;
  searchable_text?: string;
}

export interface ServiceCategory {
  category: string;
  icon: string;
  search_tags: string[];
  competencies?: Competency[];
  services?: Competency[]; // Some categories use 'services' instead of 'competencies'
}

export interface CompetenciesData {
  services_catalog: {
    [key: string]: ServiceCategory;
  };
  search_features?: any;
  metadata?: any;
}

export type CompetencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SelectedCompetency {
  pscCode: string;
  level: CompetencyLevel;
  categoryId: string;
  categoryName: string;
  competencyName: string;
}

export interface CompetencyWithCategory extends Competency {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryTags: string[];
}