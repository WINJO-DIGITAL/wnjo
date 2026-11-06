/**
 * The tool registry. Agents can act only through these tools. Each tool has a schema-checked handler, and
 * high-risk tools never run without an owner approval. Handlers receive already-authorised arguments.
 */

export type ToolContext = { tenantId: string; projectId: string | null; taskId: string };

export type ToolDefinition = {
  name: string;
  description: string;
  /** High-risk tools (money, scope, production, permissions) need an owner approval before they run. */
  highRisk: boolean;
  validate: (args: Record<string, unknown>) => string | null;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
};

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool "${tool.name}" is already registered`);
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }
}
