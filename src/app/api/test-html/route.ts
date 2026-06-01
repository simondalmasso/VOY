import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';

export async function GET() {
  const html = readFileSync('/home/z/my-project/movilidad.html', 'utf-8');
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
