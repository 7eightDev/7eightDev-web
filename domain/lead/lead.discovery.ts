export interface LeadSearchInput {
  readonly query: string;
  readonly location: string;
  readonly quantity?: number;
}

export interface DiscoveredLead {
  readonly companyName: string;
  readonly category?: string;
  readonly website?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
}

export interface LeadDiscoveryPort {
  search(input: LeadSearchInput): Promise<DiscoveredLead[]>;
}
