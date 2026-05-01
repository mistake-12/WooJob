'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Stats } from '@/types/database';

/**
 * 获取 Header 右侧统计指标
 */
export async function getStats(): Promise<{ stats?: Stats; error?: string }> {
  console.log('[getStats] Fetching stats...');

  try {
    const supabase = await createServerSupabaseClient();

    const [activeResult, trashedResult, offerResult] = await Promise.all([
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .neq('stage', '已结束'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .not('deleted_at', 'is', null),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('stage', 'Offer'),
    ]);

    const totalJobs = activeResult.count ?? 0;
    const trashedCount = trashedResult.count ?? 0;
    const offerCount = offerResult.count ?? 0;

    const totalSubmitted = totalJobs + offerCount;
    const successRate =
      totalSubmitted > 0
        ? `${Math.round((offerCount / totalSubmitted) * 100)}%`
        : '0%';

    const stats: Stats = {
      totalJobs,
      trashedCount,
      successRate,
      status: '求职中',
    };

    console.log('[getStats] Returning stats:', stats);
    return { stats };
  } catch (err) {
    console.error('[getStats] Unexpected error:', err);
    return { error: 'Failed to fetch stats' };
  }
}
