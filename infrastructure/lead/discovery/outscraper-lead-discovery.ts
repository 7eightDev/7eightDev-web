import type {
  DiscoveredLead,
  LeadSearchInput,
  LeadDiscoveryPort
} from '@/domain/lead/lead.discovery';

interface OutscraperResult {
  readonly name: string;
  readonly category?: string;
  readonly website?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
}

interface OutscraperClient {
  search(input: LeadSearchInput): Promise<OutscraperResult[]>;
}

export class OutscraperLeadDiscovery implements LeadDiscoveryPort {
  constructor(private readonly client: OutscraperClient) {}

  async search(input: LeadSearchInput): Promise<DiscoveredLead[]> {
    const results = await this.client.search(input);

    if (!Array.isArray(results)) {
      return [];
    }

    return results.map((result) => ({
      companyName: result.name,
      category: result.category,
      website: result.website,
      phone: result.phone,
      email: result.email,
      address: result.address,
      city: result.city
    }));
  }
}
