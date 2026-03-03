// Storage facade - combines all domain modules into a unified storage object

import * as defensesStorage from './defenses';
import * as competitiveStorage from './competitive';
import * as sparringStorage from './sparring';
import * as gauntletStorage from './gauntlet';
import * as normingStorage from './norming';

export const storage = {
  ...defensesStorage,
  ...competitiveStorage,
  ...sparringStorage,
  ...gauntletStorage,
  ...normingStorage,
};
