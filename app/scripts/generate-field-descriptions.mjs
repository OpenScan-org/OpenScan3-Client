import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const openapiPath = path.resolve(projectRoot, '../openapi_next.json');
const outputDir = path.resolve(projectRoot, 'src/generated/api');
const descriptionsOutputPath = path.resolve(outputDir, 'fieldDescriptions.ts');
const defaultsOutputPath = path.resolve(outputDir, 'fieldDefaults.ts');

const rawSpec = readFileSync(openapiPath, 'utf-8');
const spec = JSON.parse(rawSpec);
const schemas = spec.components?.schemas ?? {};

const sortObject = (input) => Object.keys(input)
  .sort((a, b) => a.localeCompare(b))
  .reduce((acc, key) => {
    acc[key] = input[key];
    return acc;
  }, {});

const collectMetadata = (schema) => {
  if (!schema || typeof schema !== 'object') {
    return { descriptions: {}, defaults: {} };
  }

  if (schema.$ref) {
    const refName = schema.$ref.split('/').at(-1);
    return collectMetadata(schemas[refName]);
  }

  let descriptions = {};
  let defaults = {};

  if (schema.allOf) {
    for (const part of schema.allOf) {
      const result = collectMetadata(part);
      descriptions = { ...descriptions, ...result.descriptions };
      defaults = { ...defaults, ...result.defaults };
    }
  }

  if (schema.anyOf) {
    for (const part of schema.anyOf) {
      const result = collectMetadata(part);
      descriptions = { ...descriptions, ...result.descriptions };
      defaults = { ...defaults, ...result.defaults };
    }
  }

  if (schema.oneOf) {
    for (const part of schema.oneOf) {
      const result = collectMetadata(part);
      descriptions = { ...descriptions, ...result.descriptions };
      defaults = { ...defaults, ...result.defaults };
    }
  }

  if (schema.properties) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if (propertySchema && typeof propertySchema === 'object') {
        // Collect Description
        if (propertySchema.description) {
          descriptions[propertyName] = propertySchema.description;
        }

        // Collect Default
        if (propertySchema.default !== undefined) {
          defaults[propertyName] = propertySchema.default;
        }

        // Handle nested/referenced schemas
        if (!descriptions[propertyName] || defaults[propertyName] === undefined) {
          const nested = collectMetadata(propertySchema);
          
          if (!descriptions[propertyName] && nested.descriptions && Object.keys(nested.descriptions).length === 1 && nested.descriptions[propertyName]) {
             descriptions[propertyName] = nested.descriptions[propertyName];
          }

          // For defaults, we look if the nested schema (e.g. from a ref) provides a default for this property? 
          // Usually properties inside properties means nested object. 
          // But here the logic seems to be trying to find description for the property itself if it's a ref.
          // Let's keep logic simple for defaults: if not on the property, check if it's a ref that has a default?
          // The 'nested' call usually returns metadata for *children* properties if it is an object type.
          // But if propertySchema is a ref to a primitive type definition (unlikely in OpenAPI for simple fields), 
          // or if it uses oneOf/anyOf.
          
          // Original logic: "if (nested && typeof nested === 'object' && Object.keys(nested).length === 1 && nested[propertyName])"
          // This suggests it handles cases where the recursion returned data for the property name itself? 
          // Or maybe it was just a heuristic. 
          
          // Let's replicate strict behavior for defaults:
          if (defaults[propertyName] === undefined && nested.defaults && Object.keys(nested.defaults).length === 1 && nested.defaults[propertyName] !== undefined) {
             defaults[propertyName] = nested.defaults[propertyName];
          }
        }
      }
    }
  }

  return { descriptions, defaults };
};

const processed = Object.entries(schemas)
  .reduce((acc, [schemaName, schema]) => {
    const { descriptions, defaults } = collectMetadata(schema);
    
    const cleanedDescriptions = Object.fromEntries(Object.entries(descriptions).filter(([, value]) => Boolean(value)));
    const cleanedDefaults = Object.fromEntries(Object.entries(defaults).filter(([, value]) => value !== undefined));

    if (Object.keys(cleanedDescriptions).length > 0) {
      acc.descriptions[schemaName] = sortObject(cleanedDescriptions);
    }
    
    if (Object.keys(cleanedDefaults).length > 0) {
      acc.defaults[schemaName] = sortObject(cleanedDefaults);
    }

    return acc;
  }, { descriptions: {}, defaults: {} });

mkdirSync(outputDir, { recursive: true });

const descriptionsContent = `/* eslint-disable */\n// This file is auto-generated by scripts/generate-field-descriptions.mjs\n\nexport const fieldDescriptions = ${JSON.stringify(sortObject(processed.descriptions), null, 2)} as const;\n\nexport type FieldDescriptions = typeof fieldDescriptions;\n\nexport const getFieldDescription = <S extends keyof FieldDescriptions, F extends keyof FieldDescriptions[S]>\n  (schema: S, field: F) => fieldDescriptions[schema][field];\n`;

const defaultsContent = `/* eslint-disable */\n// This file is auto-generated by scripts/generate-field-descriptions.mjs\n\nexport const fieldDefaults = ${JSON.stringify(sortObject(processed.defaults), null, 2)} as const;\n\nexport type FieldDefaults = typeof fieldDefaults;\n\nexport const getFieldDefault = <S extends keyof FieldDefaults, F extends keyof FieldDefaults[S]>\n  (schema: S, field: F) => fieldDefaults[schema][field];\n`;

writeFileSync(descriptionsOutputPath, descriptionsContent);
writeFileSync(defaultsOutputPath, defaultsContent);
