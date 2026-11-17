/* Même scénario que reouverture.test.js, match rouvert depuis Supabase (faux client). */
process.argv[2] = 'remote';
require('./reouverture.test.js');
