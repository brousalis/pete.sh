-- Exercise Demo Videos Schema
-- Stores demonstration videos for exercises that can be referenced by exercise name

-- Create exercise_demo_videos table
CREATE TABLE IF NOT EXISTS exercise_demo_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL,                    -- Normalized exercise name (e.g., 'deadlift', 'bench-press')
    video_url TEXT NOT NULL,                        -- Full video URL or video ID
    video_type TEXT NOT NULL DEFAULT 'youtube',     -- 'youtube', 'vimeo', 'mp4', 'external'
    title TEXT,                                     -- Optional title for the video
    description TEXT,                               -- Optional description
    thumbnail_url TEXT,                             -- Optional thumbnail URL
    is_primary BOOLEAN DEFAULT FALSE,               -- Whether this is the primary demo video for this exercise
    display_order INTEGER DEFAULT 0,                -- Order for displaying multiple videos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on exercise_name for quick lookups
CREATE INDEX IF NOT EXISTS idx_exercise_demo_videos_exercise_name
    ON exercise_demo_videos(exercise_name);

-- Create index on video_type for filtering
CREATE INDEX IF NOT EXISTS idx_exercise_demo_videos_video_type
    ON exercise_demo_videos(video_type);

-- Create unique index to prevent duplicate primary videos per exercise
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_demo_videos_primary
    ON exercise_demo_videos(exercise_name)
    WHERE is_primary = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exercise_demo_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_exercise_demo_videos_updated_at ON exercise_demo_videos;
CREATE TRIGGER trigger_exercise_demo_videos_updated_at
    BEFORE UPDATE ON exercise_demo_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_demo_videos_updated_at();

-- Enable Row Level Security
ALTER TABLE exercise_demo_videos ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (adjust as needed for your auth setup)
CREATE POLICY "Allow all operations on exercise_demo_videos"
    ON exercise_demo_videos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE exercise_demo_videos IS 'Stores demonstration videos for exercises';
COMMENT ON COLUMN exercise_demo_videos.exercise_name IS 'Normalized exercise name used to match with exercises in workout definitions';
COMMENT ON COLUMN exercise_demo_videos.video_url IS 'Full URL or video ID depending on video_type';
COMMENT ON COLUMN exercise_demo_videos.video_type IS 'Type of video: youtube, vimeo, mp4, external';
COMMENT ON COLUMN exercise_demo_videos.is_primary IS 'Whether this is the primary demo video shown by default';
COMMENT ON COLUMN exercise_demo_videos.display_order IS 'Order for displaying multiple videos for the same exercise';
