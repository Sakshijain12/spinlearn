import { NextRequest, NextResponse } from 'next/server';
import { topicsListRequestSchema } from '@/lib/schemas/validation';
import { SAMPLE_TOPICS } from '@/lib/data';
import { apiAuthError } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await apiAuthError();
    if (unauthorized) return unauthorized;
    const searchParams = request.nextUrl.searchParams;
    
    const params = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      level: searchParams.get('level') || undefined,
      status: (searchParams.get('status') as string | null) || undefined,
      sort: (searchParams.get('sort') as string | null) || 'recommended',
      limit: parseInt(searchParams.get('limit') || '20'),
      cursor: searchParams.get('cursor') || undefined,
    };
    
    // Validate
    const validated = topicsListRequestSchema.parse(params);
    
    // Filter topics
    let filtered = [...SAMPLE_TOPICS];
    
    if (validated.q) {
      const query = validated.q.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) || 
             t.definition.toLowerCase().includes(query)
      );
    }
    
    if (validated.category) {
      filtered = filtered.filter(t => t.category === validated.category);
    }
    
    if (validated.level) {
      filtered = filtered.filter(t => t.level === validated.level);
    }
    
    // Sort
    if (validated.sort === 'name') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (validated.sort === 'level') {
      const levelOrder = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
      filtered = filtered.sort((a, b) => 
        (levelOrder[a.level as keyof typeof levelOrder] || 0) - 
        (levelOrder[b.level as keyof typeof levelOrder] || 0)
      );
    }
    
    // Paginate
    const start = params.cursor ? parseInt(Buffer.from(params.cursor, 'base64').toString()) : 0;
    const items = filtered.slice(start, start + validated.limit);
    
    const nextCursor = start + validated.limit < filtered.length 
      ? Buffer.from((start + validated.limit).toString()).toString('base64')
      : null;
    
    return NextResponse.json({
      items: items.map(t => ({
        slug: t.slug,
        name: t.name,
        category: t.category,
        level: t.level,
        minutes: t.minutes,
        definition: t.definition,
        status: 'new',
      })),
      next_cursor: nextCursor,
      total: filtered.length,
    });
  } catch (error) {
    if (!(error instanceof ZodError)) {
      console.error('Spinlearn could not load topics.', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Topics could not be loaded. Try again.' } },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid request parameters' } },
      { status: 400 }
    );
  }
}
