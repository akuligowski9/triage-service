import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('triage_results', (table) => {
    table.dropColumn('confidence');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('triage_results', (table) => {
    table.decimal('confidence', 3, 2).notNullable().defaultTo(0);
  });
}
