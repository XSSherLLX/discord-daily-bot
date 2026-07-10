import { db } from "@/db";
import { forumPosts } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
  const posts = await db.select().from(forumPosts).orderBy(desc(forumPosts.createdAt));
  return NextResponse.json(posts);
}
