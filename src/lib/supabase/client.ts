// Placeholder Supabase client for document chat system
// This is a simplified placeholder - implement actual Supabase integration as needed

export const supabase = {
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
  }),
}