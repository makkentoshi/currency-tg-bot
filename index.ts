import { connectDatabase } from './database';
import './bot';


connectDatabase().catch(console.error);