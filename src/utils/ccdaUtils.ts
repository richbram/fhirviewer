import { Resource } from 'fhir/r4';
import { v4 as uuidv4 } from 'uuid';
import { CCDASection } from '../types/ccda';

/**
 * Serializes an XML node to string
 */
export class XMLSerializer {
    serializeToString(node: Node): string {
        // Simple implementation for xmldom nodes
        if (node.nodeType === 1) {
            // ELEMENT_NODE
            const element = node as Element;
            let html = '<' + element.nodeName;

            // Add attributes
            const attrs = element.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                html += ` ${attr.name}="${attr.value}"`;
            }

            html += '>';

            // Add children
            for (let i = 0; i < element.childNodes.length; i++) {
                html += this.serializeToString(element.childNodes[i]);
            }

            html += '</' + element.nodeName + '>';
            return html;
        } else if (node.nodeType === 3) {
            // TEXT_NODE
            return node.nodeValue || '';
        }

        return '';
    }
}

/**
 * Extracts document title from CCDA DOM
 */
export function extractDocumentTitle(dom: Document): string | null {
    try {
        const titleElements = dom.getElementsByTagName('title');
        if (titleElements.length > 0) {
            return titleElements[0].textContent;
        }

        // Try to get title from ClinicalDocument/title
        const docTitleElements = dom.documentElement.getElementsByTagName('title');
        if (docTitleElements.length > 0) {
            return docTitleElements[0].textContent;
        }

        return null;
    } catch (err) {
        console.warn('Error extracting document title:', err);
        return null;
    }
}

/**
 * Extracts document type from CCDA DOM
 */
export function extractDocumentType(dom: Document): string | null {
    try {
        // Try to get from code@displayName or code@code
        const codeElements = dom.documentElement.getElementsByTagName('code');
        if (codeElements.length > 0) {
            const displayName = codeElements[0].getAttribute('displayName');
            if (displayName) return displayName;

            const code = codeElements[0].getAttribute('code');
            if (code) return code;
        }

        return null;
    } catch (err) {
        console.warn('Error extracting document type:', err);
        return null;
    }
}

/**
 * Extracts document date from CCDA DOM
 */
export function extractDocumentDate(dom: Document): string | null {
    try {
        // Look for effectiveTime
        const timeElements = dom.documentElement.getElementsByTagName('effectiveTime');
        if (timeElements.length > 0) {
            const value = timeElements[0].getAttribute('value');
            if (value) {
                // Try to convert HL7 date format (YYYYMMDD) to ISO
                if (/^\d{8}/.test(value)) {
                    const year = value.substring(0, 4);
                    const month = value.substring(4, 6);
                    const day = value.substring(6, 8);
                    return `${year}-${month}-${day}`;
                }
                return value;
            }
        }

        return null;
    } catch (err) {
        console.warn('Error extracting document date:', err);
        return null;
    }
}

/**
 * Extracts values from XML using simple DOM traversal
 */
export function extractValueFromElement(element: Element, xpath: string): string | null {
    try {
        // Simple path parsing - this handles basic paths like "element/child" or "@attribute"
        if (xpath.startsWith('@')) {
            // Handle attribute access
            const attrName = xpath.substring(1);
            return element.getAttribute(attrName);
        }

        const parts = xpath.split('/').filter(Boolean);
        let current: Element | null = element;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current) return null;

            if (part.startsWith('@')) {
                // Handle attribute
                const attrName = part.substring(1);
                return current.getAttribute(attrName);
            } else if (i === parts.length - 1) {
                // Last part - return text content
                const elements: HTMLCollectionOf<Element> = current.getElementsByTagName(part);
                if (elements.length > 0) {
                    return elements[0].textContent;
                }
                return null;
            } else {
                // Navigate to child element
                const elements: HTMLCollectionOf<Element> = current.getElementsByTagName(part);
                if (elements.length > 0) {
                    current = elements[0];
                } else {
                    return null;
                }
            }
        }

        // If xpath was empty or just navigated to an element
        return current?.textContent || null;
    } catch (err) {
        console.warn(`Error extracting value using ${xpath}:`, err);
        return null;
    }
}

/**
 * Sets a nested property on an object by path
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
            current[key] = value;
        } else {
            if (!current[key]) current[key] = {};
            current = current[key];
        }
    });
}

/**
 * Builds a Composition resource referencing all others
 */
export function buildComposition(resourceMap: Record<string, Resource[]>): Resource {
    return {
        resourceType: 'Composition',
        id: uuidv4(),
        status: 'final',
        type: {
            coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Summarization of Episode Note' }]
        },
        date: new Date().toISOString(),
        title: 'Converted CCDA Document',
        section: Object.entries(resourceMap).map(([type, resources]) => ({
            title: type,
            entry: resources.map((r) => ({ reference: `${r.resourceType}/${r.id}` }))
        }))
    };
}

/**
 * Extracts CCDA sections from the document
 */
export function extractCCDASections(ccdaDom: Document): CCDASection[] {
    const sectionInfo: CCDASection[] = [];

    try {
        const sections = ccdaDom.getElementsByTagName('section');

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i] as Element;
            const title = section.getElementsByTagName('title');
            const titleText = title.length > 0 ? title[0].textContent || 'Unknown' : 'Unknown';
            const code = section.getElementsByTagName('code');
            let codeValue = '';
            let displayName = '';

            // Extract text content
            const textElements = section.getElementsByTagName('text');
            let textContent = '';
            if (textElements.length > 0) {
                // Serialize the content to HTML
                const serializer = new XMLSerializer();
                textContent = serializer.serializeToString(textElements[0]);
            }

            if (code.length > 0) {
                codeValue = code[0].getAttribute('code') || '';
                displayName = code[0].getAttribute('displayName') || '';
            }

            sectionInfo.push({
                title: titleText,
                code: codeValue,
                displayName,
                text: textContent
            });
        }
    } catch (err) {
        console.error(`Error finding sections:`, err);
    }

    return sectionInfo;
}
