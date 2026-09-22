import Ajv from 'ajv';
import sharedSchema from '@/schemas/access-rules.schema.json';

// Shared AAS query/access-rule grammar from BaSyx AAS Web UI. Narrow its root
// to access policies so a valid query cannot be uploaded as a policy.
const sharedDefinitions: Record<string, unknown> = { ...sharedSchema };
delete sharedDefinitions.oneOf;
const definitions = sharedSchema.definitions as Record<string, Record<string, unknown>>;
const acl = definitions.ACL as { properties: Record<string, unknown> };
const accessPermissionRule = definitions.AccessPermissionRule as {
  properties: Record<string, unknown>;
};

export const ACCESS_POLICY_SCHEMA_URI =
  'https://admin-shell.io/aas-access-rules/policy.schema.json';
export const ACCESS_POLICY_MODEL_PATTERN = 'inmemory://access-policy/*.json';
export const accessPolicySchema = {
  ...sharedDefinitions,
  title: 'AAS Access Policy',
  definitions: {
    ...definitions,
    // BaSyx Go's ACL model uses one named attribute group, not an array.
    ACL: { ...acl, properties: { ...acl.properties, USEATTRIBUTES: { type: 'string' } } },
    // The shared schema has additionalProperties on these $ref properties;
    // AJV applies them to the referenced object and rejects valid expressions.
    AccessPermissionRule: {
      ...accessPermissionRule,
      properties: {
        ...accessPermissionRule.properties,
        FORMULA: { $ref: '#/definitions/logicalExpression' },
        FILTER: { $ref: '#/definitions/SecurityQueryFilter' },
      },
    },
  },
  properties: {
    AllAccessPermissionRules: { $ref: '#/definitions/AllAccessPermissionRules' },
  },
  required: ['AllAccessPermissionRules'],
  additionalProperties: false,
};

export const TRUST_LIST_SCHEMA_URI = 'inmemory://schemas/oidc-trust-list.schema.json';
export const TRUST_LIST_MODEL_PATTERN = 'inmemory://oidc-trust-list/*.json';
export const trustListSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'OIDC trust list',
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: {
      issuer: { type: 'string', minLength: 1, description: 'OIDC issuer URL in accepted tokens.' },
      audience: { type: 'string', minLength: 1, description: 'Accepted token audience.' },
      scopes: { type: 'array', items: { type: 'string' } },
    },
    required: ['issuer', 'audience'],
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
const policyValidator = ajv.compile(accessPolicySchema);
const trustListValidator = ajv.compile(trustListSchema);

export function validateSchemaJson(
  input: string,
  kind: 'policy' | 'trust-list'
): string | undefined {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    return `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`;
  }

  const validator = kind === 'policy' ? policyValidator : trustListValidator;
  if (validator(value)) return undefined;
  const first = validator.errors?.[0];
  if (!first) return 'The JSON does not match the schema.';
  const location = first.instancePath || 'root';
  return `${location}: ${first.message || 'does not match the schema'}`;
}
