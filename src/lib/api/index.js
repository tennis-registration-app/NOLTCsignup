/**
 * API / Data Access Layer
 *
 * Components should import from here for data access.
 * Raw ApiAdapter should NOT be imported by components directly.
 */

export { getBoard, transformBoardUpdate, setApiAdapter } from './boardApi.js';
