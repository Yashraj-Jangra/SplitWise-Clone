export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class DatabasePermissionError extends Error {
  context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const message = `DatabasePermissionError: Missing or insufficient permissions:\n${JSON.stringify(
      context,
      null,
      2
    )}`;
    super(message);
    this.name = 'DatabasePermissionError';
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabasePermissionError);
    }
  }
}

// Alias for backwards compatibility
export { DatabasePermissionError as FirestorePermissionError };
