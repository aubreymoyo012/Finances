// scripts/verify-db.js
// Usage:
//   # macOS/Linux
//   DATABASE_URL=postgres://user:pass@host:port/db node scripts/verify-db.js
//   # Windows PowerShell
//   $env:DATABASE_URL="postgres://user:pass@host:port/db"; node scripts/verify-db.js
//   # Windows CMD
//   set DATABASE_URL=postgres://user:pass@host:port/db && node scripts\verify-db.js
//
// Options:
//   --json   prints a JSON summary instead of human text

const path = require('path');
const { createRequire } = require('module');

function loadSequelize() {
  // Try normal resolution first (root node_modules)
  try {
    return require('sequelize');
  } catch (_) {}

  // Try resolving from ./backend (where sequelize is installed in this repo)
  const candidates = [
    path.resolve(__dirname, '../backend/package.json'),
    path.resolve(process.cwd(), 'backend/package.json'),
    // direct to module package.json in case package.json isn't present
    path.resolve(__dirname, '../backend/node_modules/sequelize/package.json'),
    path.resolve(process.cwd(), 'backend/node_modules/sequelize/package.json'),
  ];

  for (const pkg of candidates) {
    try {
      const req = createRequire(pkg);
      return req('sequelize');
    } catch (_) {}
  }

  throw new Error(
    "Cannot find module 'sequelize'. Install it at the repo root or inside ./backend, or move this script into the directory that has sequelize."
  );
}

const { Sequelize } = loadSequelize();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Please set DATABASE_URL in your environment.');
  process.exit(2);
}

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.PGSSL === 'require' ? { require: true, rejectUnauthorized: false } : undefined
  }
});

const EXPECTED_INDEXES = [
  'transactions_household_date_idx',
  'transactions_category_idx',
  'transactions_type_idx',
  'budgets_household_period_idx',
  'budgets_category_idx',
  'receipts_user_date_idx',
  'categories_household_idx',
  'receipt_items_receipt_idx',
  'receipt_items_name_trgm_idx'
];

const DEFAULT_CATEGORIES = [
  // expenses
  { name: 'Housing', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  // savings
  { name: 'Savings', type: 'savings' },
  { name: 'Investments', type: 'savings' },
  // income
  { name: 'Salary', type: 'income' },
  { name: 'Bonus', type: 'income' },
  { name: 'Freelance', type: 'income' },
];

async function q(query, replacements) {
  const [rows] = await sequelize.query(query, { replacements });
  return rows;
}

async function hasExtension(name) {
  const rows = await q(`select exists (select 1 from pg_extension where extname = :n) as enabled`, { n: name });
  return rows[0]?.enabled === true;
}

async function indexExists(name) {
  const rows = await q(`select to_regclass(:n) as oid`, { n: `public.${name}` });
  return rows[0]?.oid !== null;
}

async function getIndexDef(name) {
  const rows = await q(`select indexdef from pg_indexes where schemaname = 'public' and indexname = :n`, { n: name });
  return rows[0]?.indexdef || null;
}

async function hasUniqueConstraintCategories() {
  const rows = await q(`
    SELECT conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'categories' AND c.contype = 'u';
  `);
  for (const r of rows) {
    const def = r.def.replace(/"/g, '');
    if (def.includes('UNIQUE') && def.includes('(householdId, name, type)')) return { ok: true, name: r.conname, def: r.def };
  }
  for (const r of rows) {
    const def = r.def.replace(/"/g, '');
    const hasAll = ['householdId', 'name', 'type'].every(col => def.includes(col));
    if (hasAll) return { ok: true, name: r.conname, def: r.def };
  }
  return { ok: false, name: null, def: null };
}

async function checkHouseholdDefaults() {
  const households = await q(`select id from households`);
  const result = [];
  for (const hh of households) {
    const rows = await q(`
      select name, type from categories
      where "householdId" = :id and "systemDefault" = true
    `, { id: hh.id });

    const have = new Set(rows.map(r => `${r.name}::${r.type}`));
    const missing = DEFAULT_CATEGORIES.filter(c => !have.has(`${c.name}::${c.type}`));
    result.push({
      householdId: hh.id,
      missingCount: missing.length,
      missing: missing
    });
  }
  return result;
}

(async () => {
  const summary = { ok: true, checks: {} };
  try {
    await sequelize.authenticate();

    summary.checks.extensions = {};
    for (const ext of ['pg_trgm', 'pgcrypto']) {
      summary.checks.extensions[ext] = await hasExtension(ext);
    }

    summary.checks.indexes = {};
    for (const idx of EXPECTED_INDEXES) {
      const exists = await indexExists(idx);
      summary.checks.indexes[idx] = { exists };
      if (idx === 'receipt_items_name_trgm_idx' && exists) {
        const def = await getIndexDef(idx);
        summary.checks.indexes[idx].definition = def;
        if (!(def || '').includes('USING gin') || !(def || '').includes('gin_trgm_ops')) {
          summary.ok = false;
          summary.checks.indexes[idx].note = 'Index exists but not GIN/TRGM as expected';
        }
      }
      if (!exists) summary.ok = false;
    }

    const unique = await hasUniqueConstraintCategories();
    summary.checks.categories_unique = unique;
    if (!unique.ok) summary.ok = false;

    summary.checks.household_defaults = await checkHouseholdDefaults();
    if (summary.checks.household_defaults.length > 0) {
      const someMissing = summary.checks.household_defaults.some(h => h.missingCount > 0);
      if (someMissing) summary.ok = false;
    }

    const asJson = process.argv.includes('--json');
    if (asJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('--- DB Verification Summary ---');
      console.log('Extensions:');
      for (const [ext, enabled] of Object.entries(summary.checks.extensions)) {
        console.log(`  ${ext}: ${enabled ? 'ENABLED' : 'missing'}`);
      }
      console.log('\nIndexes:');
      for (const [idx, info] of Object.entries(summary.checks.indexes)) {
        console.log(`  ${idx}: ${info.exists ? 'OK' : 'missing'}` + (info.note ? ` (${info.note})` : ''));
      }
      console.log('\nCategories UNIQUE constraint on (householdId, name, type):', unique.ok ? `OK (${unique.name})` : 'MISSING');

      if (summary.checks.household_defaults.length === 0) {
        console.log('\nHouseholds: none found (skip household default check).');
      } else {
        console.log('\nHousehold default categories:');
        for (const hh of summary.checks.household_defaults) {
          console.log(`  ${hh.householdId}: ${hh.missingCount === 0 ? 'OK' : `missing ${hh.missingCount} -> ${hh.missing.map(m => m.name + '/' + m.type).join(', ')}`}`);
        }
      }
      console.log('\nOVERALL:', summary.ok ? 'PASS' : 'FAIL');
    }

    await sequelize.close();
    process.exit(summary.ok ? 0 : 1);
  } catch (err) {
    console.error('Verification error:', err.message);
    try { await sequelize.close(); } catch {}
    process.exit(3);
  }
})();
