'use client';

import { Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PostManager } from '@/components/blog/post-manager';
import { CommentManager } from '@/components/blog/comment-manager';
import { BlogLoading, useBlogFilters } from '@/components/blog/blog-ui';

function BlogAdmin() {
  const { params, update } = useBlogFilters();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">
          Contenido
        </p>
        <h1 className="mt-2 text-2xl font-bold">Blog</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Publicaciones, experiencias y conversaciones de Playa Terco.
        </p>
      </header>
      <Tabs
        value={params.get('blog_view') === 'comments' ? 'comments' : 'posts'}
        onValueChange={(value) => update({ blog_view: value })}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Publicaciones</TabsTrigger>
          <TabsTrigger value="comments">Comentarios</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostManager admin />
        </TabsContent>
        <TabsContent value="comments">
          <CommentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default function AdminBlogPage() {
  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogAdmin />
    </Suspense>
  );
}
