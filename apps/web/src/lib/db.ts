import {cache} from 'react';
import {connectAsPostgres, type Database} from '@motionknowledge/database';

export const getServiceDb = cache((): Database => {
  const {db} = connectAsPostgres();
  return db;
});
