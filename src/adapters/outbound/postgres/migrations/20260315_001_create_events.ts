import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary();
    table.string('source_type', 50).notNullable();
    table.string('project', 100).notNullable();
    table.string('environment', 20).notNullable().defaultTo('development');
    table.text('message').notNullable();
    table.text('stack_trace');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.timestamp('received_at', { useTz: true }).defaultTo(knex.fn.now());
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('idempotency_key', 64).notNullable().unique();
    table.text('issue_url');
    table.text('error_message');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('status', 'idx_events_status');
    table.index('project', 'idx_events_project');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events');
}
