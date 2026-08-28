import type {
  DiscoveredLead,
  LeadSearchInput
} from '@/domain/lead/lead.discovery';
import { OutscraperLeadDiscovery } from '@/infrastructure/lead/discovery/outscraper-lead-discovery';

interface OutscraperClient {
  search(input: LeadSearchInput): Promise<
    {
      name: string;
      category?: string;
      website?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
    }[]
  >;
}

describe('OutscraperLeadDiscovery', () => {
  it('maps an Outscraper result to DiscoveredLead', async () => {
    const client: OutscraperClient = {
      search: jest.fn().mockResolvedValue([
        {
          name: 'Acme Web',
          category: 'Web Agency',
          website: 'https://acme.example',
          phone: '+39 049 1234567',
          address: 'Via Roma 1',
          city: 'Padova'
        }
      ])
    };

    const discovery = new OutscraperLeadDiscovery(client);

    const input: LeadSearchInput = {
      query: 'web agencies',
      location: 'Padova',
      quantity: 2
    };

    const result: DiscoveredLead[] = await discovery.search(input);

    expect(client.search).toHaveBeenCalledWith(input);

    expect(result).toEqual([
      {
        companyName: 'Acme Web',
        category: 'Web Agency',
        website: 'https://acme.example',
        phone: '+39 049 1234567',
        address: 'Via Roma 1',
        city: 'Padova'
      }
    ]);
  });
  it('returns an empty array when Outscraper finds no leads', async () => {
    const client: OutscraperClient = {
      search: jest.fn().mockResolvedValue([])
    };

    const discovery = new OutscraperLeadDiscovery(client);

    const input: LeadSearchInput = {
      query: 'web agencies',
      location: 'Padova',
      quantity: 10
    };

    await expect(discovery.search(input)).resolves.toEqual([]);
    expect(client.search).toHaveBeenCalledWith(input);
  });
  it('maps the email field', async () => {
    const client: OutscraperClient = {
      search: jest.fn().mockResolvedValue([
        {
          name: 'Acme Web',
          email: 'info@acme.example'
        }
      ])
    };

    const discovery = new OutscraperLeadDiscovery(client);

    const input: LeadSearchInput = {
      query: 'web agencies',
      location: 'Padova',
      quantity: 1
    };

    const result = await discovery.search(input);

    expect(result).toEqual([
      {
        companyName: 'Acme Web',
        category: undefined,
        website: undefined,
        phone: undefined,
        email: 'info@acme.example',
        address: undefined,
        city: undefined
      }
    ]);
  });
  it('returns an empty array when Outscraper returns an invalid result', async () => {
    const client: OutscraperClient = {
      search: jest.fn().mockResolvedValue(null)
    };

    const discovery = new OutscraperLeadDiscovery(client);

    const input: LeadSearchInput = {
      query: 'web agencies',
      location: 'Padova',
      quantity: 1
    };

    await expect(discovery.search(input)).resolves.toEqual([]);
  });
  it('propagates provider errors', async () => {
    const error = new Error('Outscraper unavailable');

    const client: OutscraperClient = {
      search: jest.fn().mockRejectedValue(error)
    };

    const discovery = new OutscraperLeadDiscovery(client);

    const input: LeadSearchInput = {
      query: 'web agencies',
      location: 'Padova',
      quantity: 1
    };

    await expect(discovery.search(input)).rejects.toThrow(
      'Outscraper unavailable'
    );
  });
});
