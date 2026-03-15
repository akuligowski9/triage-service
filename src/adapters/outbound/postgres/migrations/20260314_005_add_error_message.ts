import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (t) => {
    t.text('error_message').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (t) => {
    t.dropColumn('error_message');
  });
}
