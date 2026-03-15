import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('triage_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().unique()
      .references('id').inTable('events').onDelete('CASCADE');
    table.string('issue_type', 20).notNullable();
    table.string('severity', 20).notNullable();
    table.string('title', 200).notNullable();
    table.text('body').notNullable();
    table.jsonb('labels').defaultTo('[]');
    table.string('component', 100);
    table.jsonb('reproduction_steps').defaultTo('[]');
    table.jsonb('acceptance_criteria').defaultTo('[]');
    table.timestamp('triaged_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('triage_results');
}
