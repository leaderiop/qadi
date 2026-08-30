import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("blog", ({ data }) => {
    return import.meta.env.MODE !== "production" || data.draft !== true;
  });
  return rss({
    title: "Qadi Blog",
    description: "Announcements, design notes, and deep dives from the Qadi authorization library.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      author: post.data.author,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
  });
}
