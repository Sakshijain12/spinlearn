import { NextRequest, NextResponse } from 'next/server';
import { spinRequestSchema } from '@/lib/schemas/validation';
import { generateId, sampleTopicPool, getTodayDate } from '@/lib/utils';
import { PUBLISHED_TOPICS } from '@/lib/lessons';
import { ZodError } from 'zod';
import { apiAuthError } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await apiAuthError();
    if (unauthorized) return unauthorized;
    const body = await request.json();
    
    // Validate request
    const validated = spinRequestSchema.parse(body);
    
    // Filter topics based on category and level
    let filteredTopics = PUBLISHED_TOPICS;
    
    if (validated.category !== 'All') {
      filteredTopics = filteredTopics.filter(t => t.category === validated.category);
    }
    
    if (validated.level !== 'All') {
      filteredTopics = filteredTopics.filter(t => t.level === validated.level);
    }
    
    if (filteredTopics.length === 0) {
      return NextResponse.json(
        { error: { code: 'EMPTY_POOL', message: 'No published lessons match these filters. Try another category or level.' } },
        { status: 422 }
      );
    }

    if (validated.respin && validated.exclude_slug && filteredTopics.length > 1) {
      filteredTopics = filteredTopics.filter(topic => topic.slug !== validated.exclude_slug);
    }
    
    // Sample the reel
    const { decoys, chosenIndex } = sampleTopicPool(
      filteredTopics.map(t => ({ slug: t.slug, name: t.name }))
    );
    
    const chosenTopic = filteredTopics.find(t => t.name === decoys[chosenIndex])!;
    const todayDate = getTodayDate('UTC');
    
    return NextResponse.json(
      {
        spin: {
          id: generateId(),
          local_date: todayDate,
          topic: {
            slug: chosenTopic.slug,
            name: chosenTopic.name,
            category: chosenTopic.category,
            level: chosenTopic.level,
            minutes: chosenTopic.minutes,
            definition: chosenTopic.definition,
          },
          respins_used: validated.respin ? 1 : 0,
          respins_left: validated.respin ? 0 : 1,
          pool_size: filteredTopics.length,
          pool_relaxed: false,
        },
        reel: { options: decoys, chosen_index: chosenIndex },
      },
      { status: 201 }
    );
  } catch (error) {
    if (!(error instanceof ZodError) && !(error instanceof SyntaxError)) {
      console.error('Spinlearn could not select a topic.', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'The topic could not be selected. Try again.' } },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid request body' } },
      { status: 400 }
    );
  }
}
