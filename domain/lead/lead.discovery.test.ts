import type {
  DiscoveredLead,
  LeadDiscoveryPort,
  LeadSearchInput
} from '@/domain/lead/lead.discovery';

describe('LeadDiscoveryPort', () => {
  it('defines a search contract for lead discovery', async () => {
    const discovery: LeadDiscoveryPort = {
      async search(): Promise<DiscoveredLead[]> {
        throw new Error('Not implemented');
      }
    };

    const input: LeadSearchInput = {
      query: 'dentist',
      location: 'Padova',
      quantity: 10
    };

    await expect(discovery.search(input)).rejects.toThrow('Not implemented');
  });
});
