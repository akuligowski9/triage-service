import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('triage_results', (table) => {
    table.jsonb('acceptance_criteria').defaultTo('[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('triage_results', (table) => {
    table.dropColumn('acceptance_criteria');
  });
}
