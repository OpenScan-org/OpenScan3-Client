import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const specsRoot = path.resolve(projectRoot, '..');
const baseOutputDir = path.resolve(projectRoot, 'src/generated/api');

const buildTargetName = (openapiFileName) => {
  if (openapiFileName === 'openapi_latest.json') {
    return 'latest';
  }

  if (openapiFileName === 'openapi_next.json') {
    return 'next';
  }

  const [, version = ''] = openapiFileName.match(/^openapi_v(\d+\.\d+)\.json$/) ?? [];
  return `v${version.replace('.', '_')}`;
};

const buildVersionAlias = (openapiFileName) => {
  if (openapiFileName === 'openapi_latest.json') {
    return 'latest';
  }

  if (openapiFileName === 'openapi_next.json') {
    return 'next';
  }

  const [, version = ''] = openapiFileName.match(/^openapi_v(\d+\.\d+)\.json$/) ?? [];
  return `v${version}`;
};

const discoverOpenapiTargets = () => {
  const openapiFileNames = readdirSync(specsRoot)
    .filter((fileName) => /^openapi_(latest|next|v\d+\.\d+)\.json$/.test(fileName))
    .sort((a, b) => a.localeCompare(b));

  const generatedTargets = openapiFileNames.map((fileName) => {
    const targetName = buildTargetName(fileName);
    const versionAlias = buildVersionAlias(fileName);
    const openapiPath = path.resolve(specsRoot, fileName);
    const outputDir = path.resolve(baseOutputDir, targetName);

    return {
      targetName,
      versionAlias,
      openapiPath,
      outputDir
    };
  });

  const latestTarget = generatedTargets.find((target) => target.targetName === 'latest');

  if (!latestTarget) {
    throw new Error('Missing required file: openapi_latest.json');
  }

  return {
    generatedTargets,
    latestPath: latestTarget.openapiPath
  };
};

const runOpenapiTs = (inputPath, outputDir) => {
  const result = spawnSync('npx', [
    'openapi-ts',
    '-i',
    inputPath,
    '-o',
    outputDir,
    '-c',
    '@hey-api/client-axios'
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`OpenAPI type generation failed for ${inputPath}`);
  }
};

const sortObject = (input) => Object.keys(input)
  .sort((a, b) => a.localeCompare(b))
  .reduce((acc, key) => {
    acc[key] = input[key];
    return acc;
  }, {});

const collectMetadata = (schema, schemas) => {
  if (!schema || typeof schema !== 'object') {
    return { descriptions: {}, defaults: {} };
  }

  if (schema.$ref) {
    const refName = schema.$ref.split('/').at(-1);
    return collectMetadata(schemas[refName], schemas);
  }

  let descriptions = {};
  let defaults = {};

  if (schema.allOf) {
    for (const part of schema.allOf) {
      const result = collectMetadata(part, schemas);
      descriptions = { ...descriptions, ...result.descriptions };
      defaults = { ...defaults, ...result.defaults };
    }
  }

  if (schema.anyOf) {
    for (const part of schema.anyOf) {
      const result = collectMetadata(part, schemas);
      descriptions = { ...descriptions, ...result.descriptions };
      defaults = { ...defaults, ...result.defaults };
    }
  }

  if (schema.oneOf) {
    for (const part of schema.oneOf) {
      const result = collectMetadata(part, schemas);
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
          const nested = collectMetadata(propertySchema, schemas);
          
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

const generateMetadataFiles = (openapiPath, outputDir) => {
  const rawSpec = readFileSync(openapiPath, 'utf-8');
  const spec = JSON.parse(rawSpec);
  const schemas = spec.components?.schemas ?? {};

  const processed = Object.entries(schemas)
    .reduce((acc, [schemaName, schema]) => {
      const { descriptions, defaults } = collectMetadata(schema, schemas);

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

  const descriptionsOutputPath = path.resolve(outputDir, 'fieldDescriptions.ts');
  const defaultsOutputPath = path.resolve(outputDir, 'fieldDefaults.ts');
  const generatorComment = '// This file is auto-generated by scripts/generate-api.mjs';

  const descriptionsContent = `/* eslint-disable */\n${generatorComment}\n\nexport const fieldDescriptions = ${JSON.stringify(sortObject(processed.descriptions), null, 2)} as const;\n\nexport type FieldDescriptions = typeof fieldDescriptions;\n\nexport const getFieldDescription = <S extends keyof FieldDescriptions, F extends keyof FieldDescriptions[S]>\n  (schema: S, field: F) => fieldDescriptions[schema][field];\n`;

  const defaultsContent = `/* eslint-disable */\n${generatorComment}\n\nexport const fieldDefaults = ${JSON.stringify(sortObject(processed.defaults), null, 2)} as const;\n\nexport type FieldDefaults = typeof fieldDefaults;\n\nexport const getFieldDefault = <S extends keyof FieldDefaults, F extends keyof FieldDefaults[S]>\n  (schema: S, field: F) => fieldDefaults[schema][field];\n`;

  writeFileSync(descriptionsOutputPath, descriptionsContent);
  writeFileSync(defaultsOutputPath, defaultsContent);
};

const generateVersionedRegistry = (targets) => {
  const outputPath = path.resolve(baseOutputDir, 'versioned.gen.ts');

  const sortedTargets = [...targets].sort((a, b) => a.targetName.localeCompare(b.targetName));
  const targetNames = sortedTargets.map((target) => target.targetName);
  const sdkImports = sortedTargets
    .map((target) => `import * as sdk_${target.targetName} from './${target.targetName}';`)
    .join('\n');
  const clientImports = sortedTargets
    .map((target) => `import { createClient as createClient_${target.targetName} } from './${target.targetName}/client';`)
    .join('\n');
  const createClientMapEntries = sortedTargets
    .map((target) => `  ${target.targetName}: createClient_${target.targetName}(),`)
    .join('\n');
  const sdkMapEntries = sortedTargets
    .map((target) => `  ${target.targetName}: sdk_${target.targetName},`)
    .join('\n');
  const versionAliasEntries = sortedTargets
    .map((target) => `  '${target.versionAlias}': '${target.targetName}',`)
    .join('\n');

  const registryContent = `/* eslint-disable */\n// This file is auto-generated by scripts/generate-api.mjs\n\n${sdkImports}\n${clientImports}\n\nexport const apiTargets = ${JSON.stringify(targetNames)} as const;\n\nexport type ApiTarget = (typeof apiTargets)[number];\n\nexport const versionToApiTarget = {\n${versionAliasEntries}\n} as const satisfies Record<string, ApiTarget>;\n\nexport const apiSdkByTarget = {\n${sdkMapEntries}\n} as const;\n\nexport type ApiSdk = (typeof apiSdkByTarget)[ApiTarget];\n\nexport const createApiClients = () => ({\n${createClientMapEntries}\n}) as const;\n\nexport type ApiClient = ReturnType<typeof createApiClients>[ApiTarget];\n`;

  writeFileSync(outputPath, registryContent);
};

const { generatedTargets, latestPath } = discoverOpenapiTargets();

runOpenapiTs(latestPath, baseOutputDir);
generateMetadataFiles(latestPath, baseOutputDir);

for (const target of generatedTargets) {
  runOpenapiTs(target.openapiPath, target.outputDir);
  generateMetadataFiles(target.openapiPath, target.outputDir);
}

generateVersionedRegistry(generatedTargets);
