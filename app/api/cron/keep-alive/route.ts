import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Verify Authorization Header if CRON_SECRET is set
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing bearer token' },
          { status: 401 }
        );
      }
    }

    // 2. Execute lightweight head query against Supabase
    const supabase = createServiceRoleSupabaseClient();
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[Supabase Keep-Alive Cron] Database query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString(),
      recordCount: count ?? 0,
    });
  } catch (err) {
    console.error('[Supabase Keep-Alive Cron] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
