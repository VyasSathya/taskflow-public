import { supabase, ensureFreshSession } from '@/lib/supabase';

const getSupabase = () => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
};

// Generic API wrapper with session refresh
export const api = {
  async get<T>(
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, unknown>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<T[]> {
    await ensureFreshSession();
    const client = getSupabase();

    let query = client.from(table).select(options?.select || '*');

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as T[];
  },

  async getOne<T>(
    table: string,
    id: string,
    options?: { select?: string }
  ): Promise<T | null> {
    await ensureFreshSession();
    const client = getSupabase();

    const { data, error } = await client
      .from(table)
      .select(options?.select || '*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as T;
  },

  async create<T>(table: string, data: Partial<T>): Promise<T> {
    await ensureFreshSession();
    const client = getSupabase();

    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  },

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    await ensureFreshSession();
    const client = getSupabase();

    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  },

  async delete(table: string, id: string): Promise<void> {
    await ensureFreshSession();
    const client = getSupabase();

    const { error } = await client.from(table).delete().eq('id', id);

    if (error) throw error;
  },

  async rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    await ensureFreshSession();
    const client = getSupabase();

    const { data, error } = await client.rpc(functionName, params);

    if (error) throw error;
    return data as T;
  },
};
