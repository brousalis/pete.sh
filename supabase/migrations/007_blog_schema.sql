-- Blog Schema Migration
-- Supports full-featured blog with posts, tags, and image storage

-- ============================================================================
-- BLOG POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '{}',        -- Tiptap JSON format for editing
  content_html TEXT,                           -- Pre-rendered HTML for fast reads
  featured_image TEXT,                         -- URL to Supabase Storage
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  tags TEXT[] DEFAULT '{}',
  reading_time_minutes INTEGER,                -- Calculated on save
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE blog_posts IS 'Blog posts with Tiptap editor content';
COMMENT ON COLUMN blog_posts.content IS 'Tiptap JSON document format for editing';
COMMENT ON COLUMN blog_posts.content_html IS 'Pre-rendered HTML for fast public reads';
COMMENT ON COLUMN blog_posts.status IS 'Post status: draft or published';
COMMENT ON COLUMN blog_posts.reading_time_minutes IS 'Estimated reading time based on word count';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trigger_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a unique slug from title
CREATE OR REPLACE FUNCTION generate_blog_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(trim(title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Truncate to reasonable length
  base_slug := left(base_slug, 100);

  final_slug := base_slug;

  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM blog_posts WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate reading time (average 200 words per minute)
CREATE OR REPLACE FUNCTION calculate_reading_time(html_content TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
BEGIN
  IF html_content IS NULL OR html_content = '' THEN
    RETURN 1;
  END IF;

  -- Strip HTML tags and count words
  word_count := array_length(
    regexp_split_to_array(
      regexp_replace(html_content, '<[^>]*>', ' ', 'g'),
      '\s+'
    ),
    1
  );

  -- Minimum 1 minute, calculate based on 200 wpm
  RETURN GREATEST(1, CEIL(word_count::FLOAT / 200));
END;
$$ LANGUAGE plpgsql;

-- Function to get published posts with pagination
CREATE OR REPLACE FUNCTION get_published_blog_posts(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  featured_image TEXT,
  tags TEXT[],
  reading_time_minutes INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image,
    bp.tags,
    bp.reading_time_minutes,
    bp.published_at,
    bp.created_at
  FROM blog_posts bp
  WHERE bp.status = 'published'
    AND bp.published_at IS NOT NULL
    AND (p_tag IS NULL OR p_tag = ANY(bp.tags))
  ORDER BY bp.published_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get all unique tags from published posts
CREATE OR REPLACE FUNCTION get_blog_tags()
RETURNS TABLE (
  tag TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(bp.tags) as tag,
    COUNT(*) as count
  FROM blog_posts bp
  WHERE bp.status = 'published'
  GROUP BY unnest(bp.tags)
  ORDER BY count DESC, tag ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published blog posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

-- Service role has full access (for API routes)
CREATE POLICY "Service role has full access to blog posts"
  ON blog_posts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon can read all posts (for dashboard viewing)
CREATE POLICY "Anon can read all blog posts"
  ON blog_posts
  FOR SELECT
  USING (true);

-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================

-- IMPORTANT: Run these commands in Supabase SQL Editor to create the storage bucket
-- Or configure via Supabase Dashboard: Storage > Create new bucket

-- Create the blog-images bucket (if using SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Storage Bucket Configuration (via Dashboard):
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: blog-images
-- 4. Public bucket: Yes (enabled)
-- 5. Click "Create bucket"

-- Then add these RLS policies for the bucket:

-- Policy 1: Public read access
-- CREATE POLICY "Public Access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'blog-images');

-- Policy 2: Service role can upload
-- CREATE POLICY "Service role can upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'blog-images'
--     AND auth.role() = 'service_role'
--   );

-- Policy 3: Service role can delete
-- CREATE POLICY "Service role can delete" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'blog-images'
--     AND auth.role() = 'service_role'
--   );

-- Recommended bucket settings:
-- - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
-- - Max file size: 5MB (5242880 bytes)
