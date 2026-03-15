import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.string('fingerprint', 16).notNullable().defaultTo('');
    table.index('fingerprint', 'idx_events_fingerprint');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropIndex('fingerprint', 'idx_events_fingerprint');
    table.dropColumn('fingerprint');
  });
}
