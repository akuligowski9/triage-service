/**
 * LangChain-based triage engine adapter.
 * Sends intake events to OpenAI and returns structured triage results
 * using LangChain's structured output with a Zod schema.
 */
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { IntakeEvent } from '../../../domain/models/event.js';
import type { TriageResult } from '../../../domain/models/triage-result.js';
import type { TriageEnginePort } from '../../../domain/ports/triage-engine.port.js';

const triageSchema = z.object({
  issueType: z.enum(['bug', 'task', 'improvement', 'question']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string().describe('Concise issue title, under 80 chars'),
  body: z.string().describe('Issue description paragraph — do NOT include section headers like "Description" or "Stack Trace", just the descriptive text and next steps'),
  labels: z.array(z.string()).describe('1-4 relevant labels'),
  component: z.string().optional().describe('Affected component or module'),
  reproductionSteps: z.array(z.string()).optional().describe('Steps to reproduce the issue'),
  acceptanceCriteria: z.array(z.string()).optional().describe('Acceptance criteria for resolving this issue'),
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a senior engineering triage assistant. Given a raw application event, classify it and produce a structured GitHub issue. Be concise. Use the project context to suggest accurate labels and components. Include reproduction steps and acceptance criteria when applicable.`,
  ],
  [
    'human',
    `Project: {project}
Source: {sourceType}
Environment: {environment}
Message: {message}
Stack Trace: {stackTrace}
Additional Context: {metadata}`,
  ],
]);

export class LangChainTriageEngine implements TriageEnginePort {
  private chainPromise;

  constructor(modelName?: string) {
    const model = new ChatOpenAI({ model: modelName ?? 'gpt-4o-mini', temperature: 0 });
    const structured = model.withStructuredOutput(triageSchema);
    this.chainPromise = Promise.resolve(prompt.pipe(structured));
  }

  async triage(event: IntakeEvent): Promise<TriageResult> {
    const chain = await this.chainPromise;
    const result = await chain.invoke({
      project: event.project,
      sourceType: event.sourceType,
      environment: event.environment,
      message: event.message,
      stackTrace: event.stackTrace ?? 'N/A',
      metadata: JSON.stringify(event.metadata ?? {}),
    }) as z.infer<typeof triageSchema>;

    return {
      eventId: event.id,
      ...result,
      triagedAt: new Date().toISOString(),
    };
  }
}
