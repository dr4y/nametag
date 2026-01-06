import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to create mocks before hoisting
const mocks = vi.hoisted(() => ({
  personFindUnique: vi.fn(),
  relationshipFindMany: vi.fn(),
}));

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    person: {
      findUnique: mocks.personFindUnique,
    },
    relationship: {
      findMany: mocks.relationshipFindMany,
    },
  },
}));

// Mock auth
vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    })
  ),
}));

// Import after mocking
import { GET } from '../../app/api/people/[id]/orphans/route';

describe('People Orphans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/people/[id]/orphans', () => {
    it('should return 404 when person not found', async () => {
      mocks.personFindUnique.mockResolvedValue(null);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Person not found');
    });

    it('should detect orphans - person with no relationshipToUser and no other relationships', async () => {
      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // Related person (will become orphan)
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: null,
          relationshipToUser: null, // No direct relationship to user
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: null,
            },
          },
        ])
        // Relationships for person-2 (only has relationship with person-1)
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(1);
      expect(body.orphans[0]).toEqual({
        id: 'person-2',
        fullName: 'Jane Smith',
      });
    });

    it('should NOT detect as orphan - person with direct relationshipToUser', async () => {
      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // Related person (NOT an orphan because has relationshipToUser)
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: null,
          relationshipToUser: { id: 'rel-type-1', label: 'Friend' }, // Has direct relationship
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-2', label: 'Colleague' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
          },
        ])
        // Relationships for person-2
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(0);
    });

    it('should NOT detect as orphan - person has other relationships', async () => {
      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // Related person (NOT an orphan because has other relationships)
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: null,
          relationshipToUser: null, // No direct relationship to user
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: null,
            },
          },
        ])
        // Relationships for person-2 (has relationship with person-1 AND person-3)
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
          {
            id: 'rel-2',
            personId: 'person-2',
            relatedPersonId: 'person-3', // Has another relationship
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(0);
    });

    it('should detect as orphan - person with soft-deleted relationshipToUser (the bug fix)', async () => {
      // This is the critical test case for the bug we just fixed
      // When a RelationshipType is soft-deleted, the relationshipToUserId field remains
      // but the relationshipToUser relation is null due to Prisma's soft-delete middleware

      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // Related person (SHOULD be orphan - relationshipToUser is soft-deleted)
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: null,
          relationshipToUser: null, // Relation is null (soft-deleted)
          // Note: relationshipToUserId would still exist in DB but we don't check it
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: null, // Soft-deleted
            },
          },
        ])
        // Relationships for person-2 (only has relationship with person-1)
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(1);
      expect(body.orphans[0]).toEqual({
        id: 'person-2',
        fullName: 'Jane Smith',
      });
    });

    it('should detect multiple orphans', async () => {
      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // First orphan
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: null,
          relationshipToUser: null,
        })
        // Second orphan
        .mockResolvedValueOnce({
          id: 'person-3',
          name: 'Bob',
          surname: 'Johnson',
          nickname: 'Bobby',
          relationshipToUser: null,
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: null,
            },
          },
          {
            id: 'rel-2',
            personId: 'person-1',
            relatedPersonId: 'person-3',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-3',
              relationshipToUser: null,
            },
          },
        ])
        // Relationships for person-2
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
        ])
        // Relationships for person-3
        .mockResolvedValueOnce([
          {
            id: 'rel-2',
            personId: 'person-1',
            relatedPersonId: 'person-3',
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(2);
      expect(body.orphans).toContainEqual({
        id: 'person-2',
        fullName: 'Jane Smith',
      });
      expect(body.orphans).toContainEqual({
        id: 'person-3',
        fullName: "Bob 'Bobby' Johnson",
      });
    });

    it('should return empty array when person has no relationships', async () => {
      // Person being deleted
      mocks.personFindUnique.mockResolvedValueOnce({
        id: 'person-1',
        userId: 'user-123',
        name: 'John',
        surname: 'Doe',
      });

      // No relationships for this person
      mocks.relationshipFindMany.mockResolvedValueOnce([]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(0);
    });

    it('should use nickname in fullName if available', async () => {
      // Person being deleted
      mocks.personFindUnique
        .mockResolvedValueOnce({
          id: 'person-1',
          userId: 'user-123',
          name: 'John',
          surname: 'Doe',
        })
        // Related person with nickname
        .mockResolvedValueOnce({
          id: 'person-2',
          name: 'Jane',
          surname: 'Smith',
          nickname: 'Jenny', // Has nickname
          relationshipToUser: null,
        });

      // Relationships for person-1
      mocks.relationshipFindMany
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
            person: {
              id: 'person-1',
              relationshipToUser: { id: 'rel-type-1', label: 'Friend' },
            },
            relatedPerson: {
              id: 'person-2',
              relationshipToUser: null,
            },
          },
        ])
        // Relationships for person-2
        .mockResolvedValueOnce([
          {
            id: 'rel-1',
            personId: 'person-1',
            relatedPersonId: 'person-2',
          },
        ]);

      const request = new Request('http://localhost/api/people/person-1/orphans');
      const context = { params: Promise.resolve({ id: 'person-1' }) };
      const response = await GET(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.orphans).toHaveLength(1);
      expect(body.orphans[0]).toEqual({
        id: 'person-2',
        fullName: "Jane 'Jenny' Smith", // Uses nickname
      });
    });
  });
});
