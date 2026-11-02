import { NextResponse } from 'next/server';
import { getGlossary, getLesson } from '@/lib/lessons';

export async function GET(
  _request: unknown,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const lesson = getLesson(slug);
    if (!lesson) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Topic not found' } },
        { status: 404 }
      );
    }
    
    // Return lesson content
    return NextResponse.json({
      lesson_id: `lesson-${slug}`,
      version: 1,
      schema_version: 'lesson.v1',
      published_at: new Date().toISOString(),
      content: lesson,
      glossary: getGlossary(slug),
    });
  } catch (error) {
    console.error('Spinlearn could not load the lesson.', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
