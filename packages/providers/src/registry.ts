export interface ProviderDescriptor {
  name: string;
  kind: 'llm' | 'research' | 'tts' | 'render' | 'storage';
  configured: boolean;
  capabilities: Record<string, string | number | boolean>;
}

export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderDescriptor>();

  register(descriptor: ProviderDescriptor): void {
    this.providers.set(descriptor.name, descriptor);
  }

  get(name: string): ProviderDescriptor | undefined {
    return this.providers.get(name);
  }

  list(): ProviderDescriptor[] {
    return [...this.providers.values()];
  }

  configured(kind: ProviderDescriptor['kind']): ProviderDescriptor[] {
    return this.list().filter((p) => p.kind === kind && p.configured);
  }
}

export const providerRegistry = new ProviderRegistry();
