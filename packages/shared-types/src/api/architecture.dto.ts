import type { Edge, Grade } from '@archlens/ir-schema';

export interface ModuleSummaryDto {
  id: string;
  name: string;
  fileCount: number;
  virtual: boolean;
  grade?: Grade;
  /** Relative file paths in this module from the latest IR. */
  filePaths: string[];
}

export interface DiagramDto {
  format: 'mermaid';
  source: string;
}

export interface ArchitectureDto {
  reportId: string;
  repoId: string;
  modules: ModuleSummaryDto[];
  edges: Edge[];
  /** File-to-file import edges from the latest IR. Absent on older scans. */
  fileEdges?: Edge[];
  diagram: DiagramDto;
  cycles: string[][];
}
