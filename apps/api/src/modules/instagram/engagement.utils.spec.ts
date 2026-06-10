import { calcEngagementRate } from './engagement.utils';
import type { IgPost } from './instagram.types';

const post = (likes: number, comments: number): IgPost => ({
  likes,
  comments,
  url: '',
  thumbnail: '',
});

describe('calcEngagementRate', () => {
  it('returns null when followers is 0', () => {
    expect(calcEngagementRate([post(100, 10)], 0)).toBeNull();
  });

  it('returns null when posts array is empty', () => {
    expect(calcEngagementRate([], 10000)).toBeNull();
  });

  it('calculates correctly for a single post', () => {
    // interactions = 100 + 10 = 110; rate = 110 / 1000 * 100 = 11.0
    expect(calcEngagementRate([post(100, 10)], 1000)).toBe(11.0);
  });

  it('calculates correctly for multiple posts', () => {
    // avg = (550 + 330) / 2 = 440; rate = 440 / 10000 * 100 = 4.4
    expect(calcEngagementRate([post(500, 50), post(300, 30)], 10000)).toBe(4.4);
  });

  it('rounds to 1 decimal place', () => {
    // interactions = 333 + 33 = 366; rate = 366 / 10000 * 100 = 3.66 => 3.7
    expect(calcEngagementRate([post(333, 33)], 10000)).toBe(3.7);
  });

  it('handles large follower counts without precision loss', () => {
    // interactions = 2000 + 50 = 2050; rate = 2050 / 500000 * 100 = 0.41 => 0.4
    expect(calcEngagementRate([post(2000, 50)], 500000)).toBe(0.4);
  });
});
