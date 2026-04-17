import { StructureDefinition } from 'fhir/r4';
import { MappingDefinition } from '../ccda';

export interface StructureDefinitionMap {
    [url: string]: StructureDefinition;
}

export interface ElementDefinition {
    path: string;
    type?: Array<{
        code?: string;
        profile?: string[];
    }>;
    mapping?: MappingDefinition[];
}
