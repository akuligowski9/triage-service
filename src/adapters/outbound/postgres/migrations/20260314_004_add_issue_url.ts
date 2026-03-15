import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.string('issue_url', 500);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('issue_url');
  });
}
