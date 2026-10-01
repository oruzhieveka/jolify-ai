import { Catalog } from '../catalog.ts';
import { DESTINATIONS } from './destinations.ts';
import { DEMO_LISTINGS } from './listings.ts';
export { DESTINATIONS, DEMO_LISTINGS };
export { DEMO_PARTNERS } from './partners.ts';
export const demoCatalog = () => new Catalog(DESTINATIONS, DEMO_LISTINGS.map((l) => ({ ...l, tags: [...l.tags] })));
