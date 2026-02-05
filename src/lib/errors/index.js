// @ts-check

export { AppError } from './AppError.js';
export { ErrorCategories } from './errorCategories.js';
export { DomainError, isDomainError, ErrorCodes } from './DomainError.js';
export { normalizeServiceError } from './normalizeError.js';

/**
 * Re-export types for convenience.
 * @typedef {import('./errorCategories.js').ErrorCategory} ErrorCategory
 */
