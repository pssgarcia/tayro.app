export interface IgPost {
  url: string;
  thumbnail: string;
  likes: number;
  comments: number;
}

export interface InstagramProfile {
  followers: number;
  recentPosts: IgPost[];
  profilePicUrl: string | null;
}

export interface InstagramProvider {
  fetchProfile(handle: string): Promise<InstagramProfile>;
}
