import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useDefenses() {
  return useQuery({
    queryKey: ['/api/defenses'],
  });
}

export function useDefense(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['/api/defenses', id],
    enabled: !!id,
  });

  const createSubmission = useMutation({
    mutationFn: async (data: {
      pov: string;
      evidence: Array<{ claim: string; source: string; sourceUrl?: string }>;
      counterEvidence?: Array<{ claim: string; source: string; sourceUrl?: string }>;
      sourceDocuments?: Array<{ title: string; url?: string; excerpt?: string }>;
    }) => {
      const res = await apiRequest('POST', `/api/defenses/${id}/submission`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses', id] });
    },
  });

  const startDebate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/defenses/${id}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses', id] });
    },
  });

  const submitReflection = useMutation({
    mutationFn: async (reflection: string) => {
      const res = await apiRequest('POST', `/api/defenses/${id}/reflection`, { reflection });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses', id] });
    },
  });

  return {
    defense: query.data as any,
    isLoading: query.isLoading,
    createSubmission,
    startDebate,
    submitReflection,
  };
}

export function useCreateDefense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; courseId?: number; mode?: string }) => {
      const res = await apiRequest('POST', '/api/defenses', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses'] });
    },
  });
}
