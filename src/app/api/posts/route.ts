import { db } from "@/db";
import { forumPosts } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const posts = await db.select().from(forumPosts).orderBy(desc(forumPosts.createdAt));
    return NextResponse.json(posts);
  } catch (error: any) {
    console.error("Posts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch posts", detail: error.message }, { status: 500 });
  }
}
