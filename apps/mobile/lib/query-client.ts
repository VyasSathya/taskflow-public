import { QueryClient } from '@tanstack/react-query';
import { QUERY_CONFIG } from '@/config/constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.staleTime,
      gcTime: QUERY_CONFIG.gcTime,
      retry: QUERY_CONFIG.retry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factory for consistent cache key management
export const queryKeys = {
  // User
  user: ['user'] as const,
  profile: (userId: string) => ['profile', userId] as const,

  // Generic pattern for any resource
  all: (resource: string) => [resource] as const,
  lists: (resource: string) => [resource, 'list'] as const,
  list: (resource: string, filters?: Record<string, unknown>) =>
    [...queryKeys.lists(resource), filters] as const,
  details: (resource: string) => [resource, 'detail'] as const,
  detail: (resource: string, id: string) =>
    [...queryKeys.details(resource), id] as const,
};

// Invalidation helpers
export const invalidateQueries = {
  user: () => queryClient.invalidateQueries({ queryKey: queryKeys.user }),
  profile: (userId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  resource: (resource: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.all(resource) }),
};
